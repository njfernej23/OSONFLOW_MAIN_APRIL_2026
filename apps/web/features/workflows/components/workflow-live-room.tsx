"use client"

import type { ReactNode } from "react"
import { RoomProvider } from "@liveblocks/react"

import "@/liveblocks.config"

export function workflowRoomId(organizationId: string, workflowId: string) {
  return `org:${organizationId}:workflow:${workflowId}`
}

export function WorkflowLiveRoom({
  organizationId,
  workflowId,
  children,
}: {
  organizationId: string
  workflowId: string
  children: ReactNode
}) {
  return (
    <RoomProvider
      id={workflowRoomId(organizationId, workflowId)}
      initialPresence={{
        cursor: null,
        selectedNodeId: null,
      }}
    >
      {children}
    </RoomProvider>
  )
}
