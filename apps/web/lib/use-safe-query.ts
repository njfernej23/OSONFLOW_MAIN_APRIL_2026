"use client"

import { useQuery } from "convex/react"

export const useSafeQuery: typeof useQuery = ((query, args, options) => {
  try {
    return useQuery(query, args, options)
  } catch {
    return undefined
  }
}) as typeof useQuery
