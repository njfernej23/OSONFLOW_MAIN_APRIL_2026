/**
 * Turns a thrown value into one sentence a business owner can act on.
 *
 * A Convex action that fails reports the whole server-side failure — the
 * `[CONVEX A(...)]` prefix, a request id, the error class, and every
 * `node_modules/.pnpm/...` stack frame under it. That string was being put
 * straight into toasts and into the run log, where it is both unreadable and
 * alarming. The useful part is the first line of the message; the rest belongs
 * in the server logs.
 */

/** Frames start here, and nothing after this point is for the reader. */
const STACK_START = /\s+at\s+(?:async\s+)?[\w<>.[\]$]+\s*\(/;

const NOISE_PREFIXES = [
  /^\[CONVEX [^\]]*\]\s*/,
  /^\[Request ID: [^\]]*\]\s*/,
  /^Server Error\s*/i,
  /^Uncaught\s+/,
  /^[A-Z][\w.]*Error:\s*/,
];

export const readableError = (error: unknown, fallback: string): string => {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (!raw.trim()) {
    return fallback;
  }

  // Convex puts its framing on its own lines before the real message.
  let message = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  const frame = message.search(STACK_START);
  if (frame > 0) {
    message = message.slice(0, frame);
  }

  let previous = "";
  while (previous !== message) {
    previous = message;
    for (const prefix of NOISE_PREFIXES) {
      message = message.replace(prefix, "");
    }
    message = message.trim();
  }

  if (!message) {
    return fallback;
  }

  return message.length > 240 ? `${message.slice(0, 237)}…` : message;
};
