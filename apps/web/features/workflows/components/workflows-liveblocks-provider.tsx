"use client"

import type { ReactNode } from "react"
import { LiveblocksProvider } from "@liveblocks/react"

import "@/liveblocks.config"

export function WorkflowsLiveblocksProvider({
  children,
}: {
  children: ReactNode
}) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth" throttle={16}>
      {children}
    </LiveblocksProvider>
  )
}
