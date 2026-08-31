import { CalendarPlusIcon, CalendarSearchIcon, CalendarX2Icon, CalendarClockIcon } from "lucide-react"

import { GOOGLE_CALENDAR_TEMPLATES } from "../constants"
import type { CatalogIcon, ToolBlueprint, ToolEffect } from "./types"

const CALENDAR_ICONS: Record<string, CatalogIcon> = {
  lookup: CalendarSearchIcon,
  append: CalendarPlusIcon,
  update: CalendarClockIcon,
  delete: CalendarX2Icon,
}

const CALENDAR_SUMMARIES: Record<string, string> = {
  lookup: "Search events or check availability before booking.",
  append: "Book a new event with the details the assistant collected.",
  update: "Find one event, then change its time or details.",
  delete: "Find one event and cancel it.",
}

const CALENDAR_EFFECTS: Record<string, ToolEffect> = {
  lookup: "read",
  append: "write",
  update: "write",
  delete: "write",
}

const CALENDAR_HIGHLIGHTS: Record<string, string[]> = {
  lookup: [
    "Searches by text and/or a time window, the same way Google Calendar search works.",
    "Returns each event's ID, so a follow-up update or cancel can target it directly.",
  ],
  append: [
    "Attendees are invited automatically when an email is provided.",
    "Accepts either a full date-time or a bare date for all-day events.",
  ],
  update: [
    "Pass an event_id from a previous search, or let it search by text and time range.",
    "Refuses to guess when more than one event matches — it lists them instead.",
  ],
  delete: [
    "Same unambiguous-match rule as update — it will not cancel the wrong event.",
    "Notifies attendees that the event was cancelled.",
  ],
}

export const googleCalendarBlueprints: ToolBlueprint[] =
  GOOGLE_CALENDAR_TEMPLATES.map((template) => ({
    id: `google_calendar_${template.operation}`,
    title: `Calendar · ${template.title}`,
    vendor: "Google Calendar",
    category: "productivity" as const,
    summary: CALENDAR_SUMMARIES[template.operation] ?? template.description,
    status: "available" as const,
    icon: CALENDAR_ICONS[template.operation] ?? CalendarClockIcon,
    tone: "info" as const,
    brand: "#1a73e8",
    tags: ["Google", "Calendar", template.title],
    effect: CALENDAR_EFFECTS[template.operation] ?? "read",
    highlights: CALENDAR_HIGHLIGHTS[template.operation],
    featured: template.operation === "append",
    auth: {
      kind: "google_oauth" as const,
      label: "Google account",
      hint: "Connect once for the whole workspace — every Calendar tool reuses it.",
      docsUrl: "https://developers.google.com/calendar/api",
    },
    docsUrl: "https://developers.google.com/calendar/api",
    setupHint:
      "Connect your Google account, then point this tool at the calendar it should use.",
    draft: () => ({
      type: "google_calendar" as const,
      name: template.name,
      description: template.toolDescription,
      parameters: template.parameters,
      config: { ...template.config },
      enabledForVoice: template.operation === "lookup",
    }),
  }))
