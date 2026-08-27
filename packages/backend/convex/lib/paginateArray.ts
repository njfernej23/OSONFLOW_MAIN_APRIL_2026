import type { PaginationOptions, PaginationResult } from "convex/server"

/**
 * Paginates an already-materialized array using the same cursor contract as
 * Convex's own paginated queries, so callers that must sort or filter in
 * memory can still be consumed by usePaginatedQuery. The cursor is just the
 * next offset encoded as a string.
 */
export const paginateArray = <T>(
  items: T[],
  paginationOpts: PaginationOptions
): PaginationResult<T> => {
  const start = paginationOpts.cursor
    ? Number.parseInt(paginationOpts.cursor, 10)
    : 0
  const safeStart = Number.isFinite(start) ? start : 0
  const end = safeStart + paginationOpts.numItems
  const isDone = end >= items.length

  return {
    page: items.slice(safeStart, end),
    isDone,
    continueCursor: isDone ? "" : String(end),
    splitCursor: null,
  }
}
