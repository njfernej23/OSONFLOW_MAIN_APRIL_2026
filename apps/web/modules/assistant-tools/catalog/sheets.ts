import { FileSpreadsheetIcon, SearchIcon, Table2Icon } from "lucide-react"

import { GOOGLE_SHEETS_TEMPLATES } from "../constants"
import type { CatalogIcon, ToolBlueprint, ToolEffect } from "./types"

const SHEETS_ICONS: Record<string, CatalogIcon> = {
  lookup: SearchIcon,
  append: FileSpreadsheetIcon,
  update: Table2Icon,
  delete: Table2Icon,
}

const SHEETS_SUMMARIES: Record<string, string> = {
  lookup:
    "Find rows by any column — the assistant only receives the columns you return.",
  append: "Write a new row with the values the assistant collected.",
  update: "Match one row, then change only the columns you allow.",
  delete: "Match one row and remove it, with a unique-match guard.",
}

const SHEETS_EFFECTS: Record<string, ToolEffect> = {
  lookup: "read",
  append: "write",
  update: "write",
  delete: "write",
}

const SHEETS_HIGHLIGHTS: Record<string, string[]> = {
  lookup: [
    "Column headers are read live from the sheet — no field mapping to maintain.",
    "Server-side query on large sheets, so a 50,000-row tab stays fast.",
    "Return columns are allow-listed: the model never sees a column you did not pick.",
  ],
  append: [
    "Parameters are generated from the columns you tick, so the schema cannot drift.",
    "Values land in the sheet's own column order, whatever order they arrive in.",
  ],
  update: [
    "Search columns find the row; update columns bound what may change.",
    "A unique-match guard blocks the write when more than one row matches.",
  ],
  delete: [
    "Deletes by match, never by row number, so an inserted row cannot shift the target.",
    "Unique-match guard is on by default.",
  ],
}

export const googleSheetsBlueprints: ToolBlueprint[] =
  GOOGLE_SHEETS_TEMPLATES.map((template) => ({
    id: `google_sheets_${template.operation}`,
    title: `Sheets · ${template.title}`,
    vendor: "Google Sheets",
    category: "data" as const,
    summary: SHEETS_SUMMARIES[template.operation] ?? template.description,
    status: "available" as const,
    icon: SHEETS_ICONS[template.operation] ?? Table2Icon,
    tone: "positive" as const,
    brand: "#0f9d58",
    tags: ["Google", "Spreadsheet", template.title],
    effect: SHEETS_EFFECTS[template.operation] ?? "read",
    highlights: SHEETS_HIGHLIGHTS[template.operation],
    featured: template.operation === "lookup",
    requiresGoogle: true,
    auth: {
      kind: "google_oauth" as const,
      label: "Google account",
      hint: "Connect once for the whole workspace — every Sheets tool reuses it.",
      docsUrl: "https://developers.google.com/sheets/api",
    },
    docsUrl: "https://developers.google.com/sheets/api",
    setupHint:
      "Pick the spreadsheet and tab, then choose which columns the assistant may touch.",
    draft: () => ({
      type: "google_sheets" as const,
      name: template.name,
      description: template.toolDescription,
      parameters: template.parameters,
      config: { spreadsheetId: "", ...template.config },
      enabledForVoice: template.operation === "lookup",
    }),
  }))
