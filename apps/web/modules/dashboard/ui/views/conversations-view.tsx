"use client"

import { InboxIcon } from "lucide-react"
import { Kbd } from "@workspace/ui/components/kbd"

export const ConversationsView = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-transparent p-6">
      <div className="surface-frosted flex max-w-[360px] flex-col items-center gap-5 rounded-[32px] px-10 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-background shadow-sm">
          <InboxIcon className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-foreground">
            No conversation open
          </p>
          <p className="mt-1.5 max-w-[220px] text-sm text-muted-foreground">
            Select a thread from the left panel to view messages and reply.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/85 px-3 py-2 text-xs text-muted-foreground shadow-sm">
          <span>Quick search</span>
          <Kbd className="text-[10px]">⌘K</Kbd>
        </div>
      </div>
    </div>
  )
}
