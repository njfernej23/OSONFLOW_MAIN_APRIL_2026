const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "em",
  "h1",
  "h2",
  "h3",
  "i",
  "li",
  "ol",
  "p",
  "strong",
  "u",
  "ul",
])

const BLOCK_TAGS = new Set(["blockquote", "h1", "h2", "h3", "li", "p"])

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const escapeAttribute = (value: string) =>
  escapeHtml(value).replaceAll("`", "&#96;")

const isSafeHref = (href: string) => {
  const trimmed = href.trim()
  return (
    trimmed.startsWith("#") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  )
}

const applyInlineMarkdown = (value: string) => {
  let next = escapeHtml(value)
  next = next.replace(
    /\[([^\]]+)]\(([^)\s]+)\)/g,
    (_match, label: string, href: string) => {
      if (!isSafeHref(href)) return label
      return `<a href="${escapeAttribute(href)}" rel="noreferrer" target="_blank">${label}</a>`
    }
  )
  next = next.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  next = next.replace(/_([^_\n]+)_/g, "<em>$1</em>")
  return next
}

const plainTextToRichHtml = (value: string) => {
  const blocks = value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  return blocks
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim())
      const firstLine = lines[0] ?? ""

      if (firstLine.startsWith("### ")) {
        return `<h3>${applyInlineMarkdown(firstLine.slice(4))}</h3>`
      }

      if (firstLine.startsWith("## ")) {
        return `<h2>${applyInlineMarkdown(firstLine.slice(3))}</h2>`
      }

      if (firstLine.startsWith("# ")) {
        return `<h1>${applyInlineMarkdown(firstLine.slice(2))}</h1>`
      }

      if (lines.every((line) => /^[-*]\s+/.test(line))) {
        return `<ul>${lines
          .map(
            (line) =>
              `<li>${applyInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`
          )
          .join("")}</ul>`
      }

      if (lines.every((line) => /^\d+\.\s+/.test(line))) {
        return `<ol>${lines
          .map(
            (line) =>
              `<li>${applyInlineMarkdown(line.replace(/^\d+\.\s+/, ""))}</li>`
          )
          .join("")}</ol>`
      }

      if (lines.every((line) => /^>\s?/.test(line))) {
        return `<blockquote>${lines
          .map((line) => applyInlineMarkdown(line.replace(/^>\s?/, "")))
          .join("<br>")}</blockquote>`
      }

      return `<p>${lines.map(applyInlineMarkdown).join("<br>")}</p>`
    })
    .join("")
}

export const isRichTextHtml = (value: string) =>
  /<\/?[a-z][\s\S]*>/i.test(value)

export const sanitizeRichTextHtml = (value: string) => {
  if (typeof document === "undefined") {
    return escapeHtml(value)
  }

  const template = document.createElement("template")
  template.innerHTML = value

  const sanitizeNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent ?? "")
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null
    }

    const element = node as HTMLElement
    const tagName = element.tagName.toLowerCase()
    const normalizedTag =
      tagName === "div" ? "p" : tagName === "span" ? "" : tagName

    const sanitizedChildren = Array.from(element.childNodes)
      .map(sanitizeNode)
      .filter((child): child is Node => child !== null)

    if (!normalizedTag || !ALLOWED_TAGS.has(normalizedTag)) {
      const fragment = document.createDocumentFragment()
      sanitizedChildren.forEach((child) => fragment.appendChild(child))
      return fragment
    }

    const cleanElement = document.createElement(normalizedTag)
    if (normalizedTag === "a") {
      const href = element.getAttribute("href") ?? ""
      if (isSafeHref(href)) {
        cleanElement.setAttribute("href", href.trim())
        cleanElement.setAttribute("rel", "noreferrer")
        cleanElement.setAttribute("target", "_blank")
      }
    }

    sanitizedChildren.forEach((child) => cleanElement.appendChild(child))

    if (
      BLOCK_TAGS.has(normalizedTag) &&
      cleanElement.textContent?.trim() === "" &&
      cleanElement.querySelector("br") === null
    ) {
      return null
    }

    return cleanElement
  }

  const wrapper = document.createElement("div")
  Array.from(template.content.childNodes)
    .map(sanitizeNode)
    .filter((child): child is Node => child !== null)
    .forEach((child) => wrapper.appendChild(child))

  return wrapper.innerHTML.trim()
}

export const richTextStorageToHtml = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ""

  if (isRichTextHtml(trimmed)) {
    return sanitizeRichTextHtml(trimmed)
  }

  return sanitizeRichTextHtml(plainTextToRichHtml(trimmed))
}
