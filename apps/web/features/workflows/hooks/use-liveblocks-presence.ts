"use client"

import { useCallback, useMemo } from "react"
import {
  shallow,
  useOthers,
  useSelf,
  useStatus,
  useUpdateMyPresence,
} from "@liveblocks/react"

import "@/liveblocks.config"

export type LivePresenceMember = {
  userId: string
  name: string
  initials: string
  imageUrl?: string
  color: string
  cursor: { x: number; y: number } | null
  selectedNodeId: string | null
  isSelf: boolean
}

const buildInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return "?"
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
}

const fallbackColor = "#315bdc"

type OtherMemberSnapshot = {
  userId: string
  name: string
  initials: string
  imageUrl?: string
  color: string
  cursor: { x: number; y: number } | null
  selectedNodeId: string | null
}

export function useLiveblocksPresence() {
  const status = useStatus()
  const self = useSelf()
  const updateMyPresence = useUpdateMyPresence()
  const isConnected = status === "connected"

  const otherMembers = useOthers((others) => {
    return others.map((other): OtherMemberSnapshot => {
      const name = other.info?.name || "Teammate"
      return {
        userId: other.id,
        name,
        initials: buildInitials(name),
        imageUrl: other.info?.avatar,
        color: other.info?.color || fallbackColor,
        cursor: other.presence.cursor,
        selectedNodeId: other.presence.selectedNodeId,
      }
    })
  }, shallow)

  const members = useMemo<LivePresenceMember[]>(() => {
    const result: LivePresenceMember[] = []

    if (self) {
      const name = self.info?.name || "You"
      result.push({
        userId: self.id,
        name,
        initials: buildInitials(name),
        imageUrl: self.info?.avatar,
        color: self.info?.color || fallbackColor,
        cursor: self.presence.cursor,
        selectedNodeId: self.presence.selectedNodeId,
        isSelf: true,
      })
    }

    for (const other of otherMembers) {
      result.push({
        ...other,
        isSelf: false,
      })
    }

    return result
  }, [otherMembers, self])

  const updateCursor = useCallback(
    (
      cursor: { x: number; y: number } | null,
      selectedNodeId?: string | null
    ) => {
      updateMyPresence({
        cursor,
        ...(selectedNodeId !== undefined ? { selectedNodeId } : {}),
      })
    },
    [updateMyPresence]
  )

  const updateSelectedNode = useCallback(
    (selectedNodeId: string | null) => {
      updateMyPresence({ selectedNodeId })
    },
    [updateMyPresence]
  )

  return {
    members,
    updateCursor,
    updateSelectedNode,
    isConnected,
    status,
  }
}

export function membersIdentityKey(members: LivePresenceMember[]) {
  return members
    .map(
      (member) =>
        [
          member.userId,
          member.name,
          member.color,
          member.imageUrl ?? "",
          member.selectedNodeId ?? "",
          member.isSelf ? "1" : "0",
          member.cursor ? `${member.cursor.x},${member.cursor.y}` : "",
        ].join(":")
    )
    .join("|")
}
