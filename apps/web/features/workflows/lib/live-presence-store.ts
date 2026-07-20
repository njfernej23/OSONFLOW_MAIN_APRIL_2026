"use client"

import { atom } from "jotai"

import type { LivePresenceMember } from "../hooks/use-liveblocks-presence"

export type LivePresenceUpdaters = {
  updateCursor: (
    cursor: { x: number; y: number } | null,
    selectedNodeId?: string | null
  ) => void
  updateSelectedNode: (selectedNodeId: string | null) => void
}

/** null = not in a Liveblocks room yet */
export const livePresenceMembersAtom = atom<LivePresenceMember[] | null>(null)

export const livePresenceConnectedAtom = atom(false)

/** Imperative updaters — refs avoid re-render loops from unstable callback identities. */
export const livePresenceUpdatersRef: {
  current: LivePresenceUpdaters | null
} = {
  current: null,
}
