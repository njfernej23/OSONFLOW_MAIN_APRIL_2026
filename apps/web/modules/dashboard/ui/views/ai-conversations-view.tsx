"use client"

import { Kbd } from "@workspace/ui/components/kbd"
import { SearchIcon, SparklesIcon } from "lucide-react"

export const AIConversationsView = () => {
  return (
    <div className="flex h-full w-full items-center justify-center bg-transparent p-6">
      <div className="surface-frosted flex w-full max-w-[440px] flex-col items-center gap-4 rounded-[32px] px-10 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-background ring-1 ring-border">
          <SparklesIcon className="size-6 text-primary" />
        </div>

        <div>
          <p className="text-[18px] font-semibold text-foreground">
            Select a transcript
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Choose a voicechat from the left to review the full AI transcript.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-background/88 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border">
          <SearchIcon className="size-3.5" />
          <span>Quick search</span>
          <Kbd className="text-[10px]">⌘K</Kbd>
        </div>
      </div>
    </div>
  )
}
