"use node"

import type { GoogleCalendarAuth } from "./googleCalendarAuth"

export type GoogleCalendarOperation = "lookup" | "append" | "update" | "delete"

export type GoogleCalendarOperationOptions = {
  auth: GoogleCalendarAuth
  calendarId: string
  operation: GoogleCalendarOperation
  args: Record<string, unknown>
}

type CalendarEventAttendee = { email?: string; responseStatus?: string }

type CalendarEventTime = { date?: string; dateTime?: string; timeZone?: string }

type CalendarEvent = {
  id?: string
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  start?: CalendarEventTime
  end?: CalendarEventTime
  attendees?: CalendarEventAttendee[]
}

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"

const stringArg = (args: Record<string, unknown>, key: string) => {
  const value = args[key]
  return typeof value === "string" ? value.trim() : ""
}

const calendarRequest = async (
  auth: GoogleCalendarAuth,
  path: string,
  init?: RequestInit
) => {
  const response = await fetch(`${CALENDAR_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.accessToken}`,
      ...(init?.headers as Record<string, string> | undefined),
    },
  })

  const raw = await response.text()
  const body = raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : null

  if (!response.ok) {
    const message =
      (body?.error as { message?: string } | undefined)?.message ||
      `Google Calendar request failed (HTTP ${response.status})`
    throw new Error(message)
  }

  return body
}

/** Detects a bare `YYYY-MM-DD` value, which Calendar treats as an all-day event. */
const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

const buildEventTime = (
  value: string,
  timeZone?: string
): CalendarEventTime =>
  isDateOnly(value)
    ? { date: value }
    : { dateTime: value, ...(timeZone ? { timeZone } : {}) }

const parseAttendees = (raw: string): CalendarEventAttendee[] =>
  raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .map((email) => ({ email }))

const formatEventSummary = (event: CalendarEvent) => ({
  id: event.id,
  summary: event.summary ?? "",
  description: event.description ?? "",
  location: event.location ?? "",
  start: event.start?.dateTime ?? event.start?.date ?? "",
  end: event.end?.dateTime ?? event.end?.date ?? "",
  attendees: (event.attendees ?? []).map((attendee) => attendee.email).filter(Boolean),
})

const findEvents = async ({
  auth,
  calendarId,
  query,
  timeMin,
  timeMax,
  maxResults,
}: {
  auth: GoogleCalendarAuth
  calendarId: string
  query?: string
  timeMin?: string
  timeMax?: string
  maxResults?: number
}): Promise<CalendarEvent[]> => {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(maxResults && maxResults > 0 ? maxResults : 10),
  })

  if (query) params.set("q", query)
  if (timeMin) params.set("timeMin", new Date(timeMin).toISOString())
  if (timeMax) params.set("timeMax", new Date(timeMax).toISOString())
  if (!timeMin) params.set("timeMin", new Date().toISOString())

  const body = await calendarRequest(
    auth,
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
  )

  return ((body?.items as CalendarEvent[] | undefined) ?? []).filter(
    (event) => event.id
  )
}

/**
 * Update and delete both need one specific event. A model can pass `event_id`
 * directly when it already has one from a prior lookup — otherwise this
 * searches the same way lookup does and refuses to act on an ambiguous match,
 * since guessing which event to change or remove is worse than asking again.
 */
const resolveTargetEvent = async ({
  auth,
  calendarId,
  args,
}: {
  auth: GoogleCalendarAuth
  calendarId: string
  args: Record<string, unknown>
}): Promise<{ event?: CalendarEvent; message?: string }> => {
  const eventId = stringArg(args, "event_id")

  if (eventId) {
    return { event: { id: eventId } }
  }

  const query = stringArg(args, "query")
  const timeMin = stringArg(args, "time_min")
  const timeMax = stringArg(args, "time_max")

  if (!query && !timeMin && !timeMax) {
    return {
      message:
        "No event was specified. Provide an event_id from a previous search, or a query / time range to find it.",
    }
  }

  const matches = await findEvents({
    auth,
    calendarId,
    query: query || undefined,
    timeMin: timeMin || undefined,
    timeMax: timeMax || undefined,
    maxResults: 5,
  })

  if (matches.length === 0) {
    return { message: "No matching event was found." }
  }

  if (matches.length > 1) {
    const options = matches
      .map((event) => formatEventSummary(event))
      .map((event) => `- ${event.id}: "${event.summary}" at ${event.start}`)
      .join("\n")

    return {
      message: `Found ${matches.length} matching events. Ask which one, then call again with that event_id:\n${options}`,
    }
  }

  return { event: matches[0] }
}

export const executeGoogleCalendarOperation = async ({
  auth,
  calendarId,
  operation,
  args,
}: GoogleCalendarOperationOptions): Promise<string> => {
  if (operation === "lookup") {
    const events = await findEvents({
      auth,
      calendarId,
      query: stringArg(args, "query") || undefined,
      timeMin: stringArg(args, "time_min") || undefined,
      timeMax: stringArg(args, "time_max") || undefined,
      maxResults:
        typeof args.max_results === "number" ? args.max_results : undefined,
    })

    if (events.length === 0) {
      return "No matching events were found on the calendar."
    }

    return JSON.stringify(events.map(formatEventSummary), null, 2)
  }

  if (operation === "append") {
    const summary = stringArg(args, "summary")
    const startTime = stringArg(args, "start_time")
    const endTime = stringArg(args, "end_time")

    if (!summary || !startTime || !endTime) {
      return "Creating an event requires a summary, start_time, and end_time."
    }

    const timeZone = stringArg(args, "time_zone") || undefined
    const attendees = stringArg(args, "attendees")

    const created = await calendarRequest(
      auth,
      `/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
      {
        method: "POST",
        body: JSON.stringify({
          summary,
          description: stringArg(args, "description") || undefined,
          location: stringArg(args, "location") || undefined,
          start: buildEventTime(startTime, timeZone),
          end: buildEventTime(endTime, timeZone),
          attendees: attendees ? parseAttendees(attendees) : undefined,
        }),
      }
    )

    const event = formatEventSummary((created ?? {}) as CalendarEvent)
    return `Created calendar event: ${JSON.stringify(event)}`
  }

  if (operation === "update") {
    const { event, message } = await resolveTargetEvent({
      auth,
      calendarId,
      args,
    })

    if (!event) {
      return message ?? "Unable to find the event to update."
    }

    const timeZone = stringArg(args, "time_zone") || undefined
    const patch: Record<string, unknown> = {}

    const summary = stringArg(args, "summary")
    const description = stringArg(args, "description")
    const location = stringArg(args, "location")
    const startTime = stringArg(args, "start_time")
    const endTime = stringArg(args, "end_time")
    const attendees = stringArg(args, "attendees")

    if (summary) patch.summary = summary
    if (description) patch.description = description
    if (location) patch.location = location
    if (startTime) patch.start = buildEventTime(startTime, timeZone)
    if (endTime) patch.end = buildEventTime(endTime, timeZone)
    if (attendees) patch.attendees = parseAttendees(attendees)

    if (Object.keys(patch).length === 0) {
      return "No fields were provided to update."
    }

    const updated = await calendarRequest(
      auth,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(
        event.id!
      )}?sendUpdates=all`,
      {
        method: "PATCH",
        body: JSON.stringify(patch),
      }
    )

    return `Updated calendar event: ${JSON.stringify(
      formatEventSummary((updated ?? {}) as CalendarEvent)
    )}`
  }

  if (operation === "delete") {
    const { event, message } = await resolveTargetEvent({
      auth,
      calendarId,
      args,
    })

    if (!event) {
      return message ?? "Unable to find the event to delete."
    }

    await calendarRequest(
      auth,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(
        event.id!
      )}?sendUpdates=all`,
      { method: "DELETE" }
    )

    return `Deleted calendar event ${event.id}.`
  }

  return "Unsupported Google Calendar operation."
}
