"use client"

import { useAtomValue, useSetAtom } from "jotai"
import { useEffect, useState } from "react"
import { ArrowLeftIcon, MessageSquareTextIcon, XIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { richTextStorageToHtml } from "@workspace/ui/lib/rich-text"
import {
  screenAtom,
  selectedHelpArticleAtom,
  selectedHelpTopicAtom,
} from "../../atoms/widget-atoms"
import { WidgetFooter } from "../components/widget-footer"
import { useStartWidgetConversation } from "../../hooks/use-start-widget-conversation"

export const WidgetArticleScreen = () => {
  const setScreen = useSetAtom(screenAtom)
  const article = useAtomValue(selectedHelpArticleAtom)
  const topic = useAtomValue(selectedHelpTopicAtom)
  const { isPending, startConversation } = useStartWidgetConversation()
  const [articleBodyHtml, setArticleBodyHtml] = useState("")

  useEffect(() => {
    if (!article) {
      setScreen("help")
    }
  }, [article, setScreen])

  useEffect(() => {
    setArticleBodyHtml(article ? richTextStorageToHtml(article.body) : "")
  }, [article])

  if (!article) {
    return null
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <header className="shrink-0 border-b border-zinc-100 px-3.5 py-3.5">
          <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
            <Button
              aria-label="Back to help"
              className="size-9 rounded-full text-zinc-600 hover:bg-zinc-100"
              onClick={() => setScreen(topic ? "topic" : "help")}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <p className="text-center text-sm font-bold">Article</p>
            <Button
              aria-label="Close article"
              className="size-9 rounded-full text-zinc-500 hover:bg-zinc-100"
              onClick={() => setScreen("selection")}
              size="icon"
              type="button"
              variant="ghost"
            >
              <XIcon className="size-5" />
            </Button>
          </div>
        </header>

        <article className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <h1 className="text-xl leading-tight font-extrabold tracking-tight text-zinc-950">
            {article.title}
          </h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-zinc-600">
            {article.excerpt}
          </p>

          <div
            className="mt-6 text-sm leading-relaxed text-zinc-800 [&_a]:font-medium [&_a]:break-words [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-200 [&_blockquote]:pl-3 [&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-4 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-4 [&_ul]:my-4 [&_ul]:ml-5 [&_ul]:list-disc"
            dangerouslySetInnerHTML={{ __html: articleBodyHtml }}
          />

          <div className="mt-7 rounded-[16px] bg-zinc-100 p-3.5">
            <p className="text-sm font-semibold text-zinc-950">
              Still need help?
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-600">
              Start an AI chat and ask a follow-up question about this article.
            </p>
            <Button
              className="mt-3 h-9 w-full gap-2 text-sm"
              disabled={isPending}
              onClick={() =>
                startConversation({
                  initialMessage: `I need help with this article: ${article.title}`,
                  returnScreen: "help",
                })
              }
              type="button"
            >
              <MessageSquareTextIcon className="size-4" />
              Start AI chat
            </Button>
          </div>
        </article>
      </div>

      <WidgetFooter />
    </>
  )
}
