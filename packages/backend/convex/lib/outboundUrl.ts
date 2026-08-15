const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
])

// Link-local range used by cloud instance metadata services (AWS/GCP/Azure).
const LINK_LOCAL_V4 = /^169\.254\./
const LOOPBACK_V4 = /^127\./
const PRIVATE_V4 = /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/
// Carrier-grade NAT, commonly routable to internal infrastructure.
const CGNAT_V4 = /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./

const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/

const isBlockedIpv4 = (hostname: string) =>
  LOOPBACK_V4.test(hostname) ||
  PRIVATE_V4.test(hostname) ||
  LINK_LOCAL_V4.test(hostname) ||
  CGNAT_V4.test(hostname) ||
  hostname.startsWith("0.")

/**
 * Expands an IPv6 literal into its eight 16-bit groups. Prefix matching on the
 * text form is not safe: `new URL()` rewrites `::ffff:169.254.169.254` to
 * `::ffff:a9fe:a9fe`, so a private address can be spelled in a form that no
 * string prefix catches.
 */
const parseIpv6 = (input: string): number[] | null => {
  let text = input
  let embeddedV4: [number, number] | null = null

  const trailingV4 = text.match(/(\d{1,3}(?:\.\d{1,3}){3})$/)

  if (trailingV4) {
    const dotted = trailingV4[1] ?? ""
    const octets = dotted.split(".").map(Number)

    if (
      octets.length !== 4 ||
      octets.some((octet) => !Number.isInteger(octet) || octet > 255)
    ) {
      return null
    }

    const [a = 0, b = 0, c = 0, d = 0] = octets
    embeddedV4 = [(a << 8) | b, (c << 8) | d]
    // Swap the dotted tail for two placeholder groups so the rest parses as a
    // plain IPv6 literal.
    text = `${text.slice(0, text.length - dotted.length)}0:0`
  }

  const halves = text.split("::")

  if (halves.length > 2) {
    return null
  }

  const toGroups = (segment: string) =>
    segment === ""
      ? []
      : segment
          .split(":")
          .map((group) =>
            /^[0-9a-f]{1,4}$/.test(group)
              ? Number.parseInt(group, 16)
              : Number.NaN
          )

  const left = toGroups(halves[0] ?? "")
  const right = halves.length === 2 ? toGroups(halves[1] ?? "") : []

  if ([...left, ...right].some(Number.isNaN)) {
    return null
  }

  let groups: number[]

  if (halves.length === 2) {
    const padding = 8 - left.length - right.length

    if (padding < 0) {
      return null
    }

    groups = [...left, ...new Array<number>(padding).fill(0), ...right]
  } else {
    groups = left
  }

  if (groups.length !== 8) {
    return null
  }

  if (embeddedV4) {
    groups[6] = embeddedV4[0]
    groups[7] = embeddedV4[1]
  }

  return groups
}

const isBlockedIpv6 = (hostname: string) => {
  const groups = parseIpv6(hostname.replace(/^\[|\]$/g, "").toLowerCase())

  if (!groups) {
    // Not a literal we can reason about, so refuse rather than guess.
    return true
  }

  const [
    first = 0,
    second = 0,
    third = 0,
    fourth = 0,
    fifth = 0,
    sixth = 0,
    seventh = 0,
    eighth = 0,
  ] = groups

  if (groups.every((group) => group === 0)) {
    return true // ::
  }

  if (groups.slice(0, 7).every((group) => group === 0) && eighth === 1) {
    return true // ::1
  }

  if ((first & 0xfe00) === 0xfc00) {
    return true // fc00::/7 unique local
  }

  if ((first & 0xffc0) === 0xfe80) {
    return true // fe80::/10 link local
  }

  if ((first & 0xffc0) === 0xfec0) {
    return true // fec0::/10 site local
  }

  // ::ffff:0:0/96 (IPv4-mapped), ::/96 (IPv4-compatible) and 64:ff9b::/96
  // (NAT64) all tunnel an IPv4 address that must be checked on its own terms.
  const isMapped =
    first === 0 &&
    second === 0 &&
    third === 0 &&
    fourth === 0 &&
    fifth === 0 &&
    (sixth === 0xffff || sixth === 0)
  const isNat64 =
    first === 0x64 &&
    second === 0xff9b &&
    third === 0 &&
    fourth === 0 &&
    fifth === 0 &&
    sixth === 0

  if (isMapped || isNat64) {
    const tunnelled = [
      seventh >> 8,
      seventh & 0xff,
      eighth >> 8,
      eighth & 0xff,
    ].join(".")

    return isBlockedIpv4(tunnelled)
  }

  return false
}

export class OutboundUrlError extends Error {}

/**
 * Validates a URL configured by an organization before the backend fetches it.
 * Organization admins can point tools at arbitrary URLs, so without this an
 * assistant tool could be used to reach cloud metadata endpoints or other
 * services reachable from the backend but not from the public internet.
 */
export const assertSafeOutboundUrl = (rawUrl: string): URL => {
  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    throw new OutboundUrlError("The configured URL is not valid.")
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new OutboundUrlError("Only http(s) URLs are supported.")
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "")

  if (
    !hostname ||
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost")
  ) {
    throw new OutboundUrlError("That URL points at a private host.")
  }

  if (hostname.includes(":") || hostname.startsWith("[")) {
    if (isBlockedIpv6(hostname)) {
      throw new OutboundUrlError("That URL points at a private host.")
    }

    return url
  }

  if (IPV4_PATTERN.test(hostname) && isBlockedIpv4(hostname)) {
    throw new OutboundUrlError("That URL points at a private host.")
  }

  return url
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const MAX_REDIRECTS = 3

/**
 * Fetches an organization-configured URL, re-validating every redirect hop.
 * Validating only the initial URL is not enough: an attacker-controlled host
 * can answer with `302 Location: http://169.254.169.254/...` and the default
 * redirect handling would follow it straight past the check above.
 */
export const safeFetch = async (
  rawUrl: string,
  init: RequestInit = {}
): Promise<Response> => {
  let currentUrl = assertSafeOutboundUrl(rawUrl).toString()
  let method = (init.method ?? "GET").toUpperCase()
  let body = init.body

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetch(currentUrl, {
      ...init,
      method,
      body,
      redirect: "manual",
    })

    if (!REDIRECT_STATUSES.has(response.status)) {
      // If the runtime ignored `redirect: "manual"` and followed on its own,
      // the hops went unchecked, so refuse the response rather than trust it.
      if (response.url && response.url !== currentUrl) {
        assertSafeOutboundUrl(response.url)
      }

      return response
    }

    const location = response.headers.get("location")

    if (!location) {
      return response
    }

    let nextUrl: URL

    try {
      nextUrl = new URL(location, currentUrl)
    } catch {
      throw new OutboundUrlError("The URL redirected to an invalid location.")
    }

    assertSafeOutboundUrl(nextUrl.toString())

    // Mirror the standard redirect semantics for the methods we send.
    if (
      response.status === 303 ||
      ((response.status === 301 || response.status === 302) && method === "POST")
    ) {
      method = "GET"
      body = undefined
    }

    currentUrl = nextUrl.toString()
  }

  throw new OutboundUrlError("The configured URL redirected too many times.")
}
