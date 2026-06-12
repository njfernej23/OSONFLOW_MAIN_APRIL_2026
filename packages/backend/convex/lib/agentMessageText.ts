const SKIPPED_PART_TYPES = new Set([
  "tool-call",
  "tool-result",
  "tool-approval-request",
  "tool-approval-response",
])

const extractTextFromPart = (part: any): string => {
  if (typeof part === "string") {
    return part
  }

  if (!part || typeof part !== "object") {
    return ""
  }

  if (typeof part.type === "string" && SKIPPED_PART_TYPES.has(part.type)) {
    return ""
  }

  if (typeof part.text === "string") {
    return part.text
  }

  if (typeof part.content === "string") {
    return part.content
  }

  if (Array.isArray(part.content)) {
    return part.content.map(extractTextFromPart).filter(Boolean).join(" ")
  }

  return ""
}

export const extractAgentMessageText = (message: any): string => {
  const role = message?.message?.role ?? message?.role

  if (role === "tool" || role === "system") {
    return ""
  }

  const explicitText = typeof message?.text === "string" ? message.text : ""
  if (explicitText.trim()) {
    return explicitText.trim()
  }

  const content = message?.message?.content ?? message?.content

  if (typeof content === "string") {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content.map(extractTextFromPart).filter(Boolean).join(" ").trim()
  }

  return ""
}

export const withAgentMessageText = <T>(message: T): T & { text: string } => ({
  ...(message as any),
  text: extractAgentMessageText(message),
})

export const getLatestTextAgentMessage = <T>(messages: T[]): (T & {
  text: string
}) | null => {
  for (const message of messages) {
    const withText = withAgentMessageText(message)

    if (withText.text) {
      return withText
    }
  }

  return null
}
