"use client"

import { AudioLinesIcon, SearchIcon } from "lucide-react"

import { Kbd } from "@workspace/ui/components/kbd"

export const AIConversationsView = () => {
  return (
    <div className="console-page flex h-full w-full items-center justify-center p-6">
      <div className="flex w-full max-w-[26rem] flex-col items-center text-center">
        <span className="console-medallion size-14">
          <AudioLinesIcon className="size-6" />
        </span>

        <p className="mt-5 text-[0.95rem] font-semibold text-foreground">
          Select a transcript
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Pick a voicechat from the list to read the full AI transcript, with
          session context and timing.
        </p>

        <div className="console-rule my-6 w-24" />

        <span className="console-inset flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
          <SearchIcon className="size-3.5" />
          Quick search
          <Kbd className="text-[0.62rem]">⌘K</Kbd>
        </span>
      </div>
    </div>
  )
}
