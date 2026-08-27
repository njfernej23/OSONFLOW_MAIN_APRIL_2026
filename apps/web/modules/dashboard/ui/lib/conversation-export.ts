type ConversationExportPayload = {
  exportedAt?: string
  type?: string
  conversation?: {
    id?: string
  }
  contactSession?: {
    name?: string
    email?: string
  } | null
}

const sanitizeFilenamePart = (value: string) => {
  const sanitized = value
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()

  return sanitized || "conversation"
}

export const downloadConversationExport = (
  payload: ConversationExportPayload,
  fallbackLabel: string
) => {
  const contactLabel =
    payload.contactSession?.name ||
    payload.contactSession?.email ||
    fallbackLabel ||
    payload.conversation?.id ||
    "conversation"
  const exportDate = (payload.exportedAt ?? new Date().toISOString()).slice(
    0,
    10
  )
  const typePrefix =
    payload.type === "ai_voice_conversation" ? "ai-voicechat" : "conversation"
  const filename = `${typePrefix}-${sanitizeFilenamePart(contactLabel)}-${exportDate}.json`
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export type CsvValue = string | number | boolean | null | undefined

export const formatCsvTimestamp = (timestamp: number | null | undefined) =>
  typeof timestamp === "number" && Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : ""

/**
 * Quotes a cell for CSV and defuses spreadsheet formula injection: a leading
 * =, +, -, @, tab or CR would otherwise be evaluated by Excel/Sheets on open.
 */
export const escapeCsvCell = (value: CsvValue) => {
  const raw = String(value ?? "")
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw

  return `"${safe.replaceAll('"', '""')}"`
}

export const stringifyCsvRows = (rows: CsvValue[][]) =>
  rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")
