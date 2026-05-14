"use client"

import { useEffect, useMemo, useRef, type FormEvent } from "react"
import { useAtom, useSetAtom } from "jotai"
import { ChevronRightIcon, SearchIcon, XIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  helpSearchQueryAtom,
  screenAtom,
  selectedHelpArticleAtom,
  selectedHelpTopicAtom,
  type WidgetHelpArticle,
  type WidgetHelpTopic,
} from "../../atoms/widget-atoms"
import { WidgetFooter } from "../components/widget-footer"
import { useHelpTopics } from "../../hooks/use-help-articles"

export const WidgetHelpScreen = () => {
  const setScreen = useSetAtom(screenAtom)
  const setSelectedHelpArticle = useSetAtom(selectedHelpArticleAtom)
  const setSelectedHelpTopic = useSetAtom(selectedHelpTopicAtom)
  const [searchQuery, setSearchQuery] = useAtom(helpSearchQueryAtom)
  const helpTopics = useHelpTopics()
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (helpTopics.length === 0) {
      setScreen("selection")
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [helpTopics.length, setScreen])

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []

    return helpTopics.flatMap((topic) =>
      topic.articles.filter((article) =>
        [
          topic.title,
          topic.excerpt,
          article.title,
          article.excerpt,
          article.body,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
    )
  }, [helpTopics, searchQuery])

  const openTopic = (topic: WidgetHelpTopic) => {
    setSelectedHelpTopic(topic)
    setScreen("topic")
  }

  const openArticle = (article: WidgetHelpArticle) => {
    setSelectedHelpArticle(article)
    setScreen("article")
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (filteredArticles.length === 1 && filteredArticles[0]) {
      openArticle(filteredArticles[0])
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <header className="shrink-0 px-4 pt-4 pb-3.5">
          <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
            <span />
            <h1 className="text-center text-xl font-bold tracking-tight">
              Help
            </h1>
            <Button
              aria-label="Close help"
              className="size-9 rounded-full text-zinc-500 hover:bg-zinc-100"
              onClick={() => setScreen("selection")}
              size="icon"
              type="button"
              variant="ghost"
            >
              <XIcon className="size-5" />
            </Button>
          </div>
          <form
            className="mt-4 flex items-center gap-2 rounded-[14px] bg-zinc-100 px-3 py-1.5"
            onSubmit={handleSubmit}
          >
            <Input
              aria-label="Search for help"
              className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus:placeholder:text-transparent focus-visible:ring-0"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search for help"
              ref={searchInputRef}
              value={searchQuery}
            />
            <Button
              aria-label="Search"
              className="size-8 shrink-0 rounded-full"
              size="icon"
              type="submit"
              variant="ghost"
            >
              <SearchIcon className="size-4" />
            </Button>
          </form>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-zinc-100">
          {!searchQuery.trim() ? (
            helpTopics.map((topic) => (
              <button
                className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-zinc-100 px-4 py-5 text-left transition duration-200 hover:bg-zinc-50 hover:opacity-80"
                key={topic.title}
                onClick={() => openTopic(topic)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-[15px] leading-snug font-bold text-zinc-950">
                    {topic.title}
                  </span>
                  <span className="mt-1.5 line-clamp-2 block text-[13px] leading-relaxed text-zinc-700">
                    {topic.excerpt}
                  </span>
                  <span className="mt-2.5 block text-[13px] text-zinc-500">
                    {topic.articles.length} articles
                  </span>
                </span>
                <ChevronRightIcon className="size-5 shrink-0 text-zinc-950" />
              </button>
            ))
          ) : filteredArticles.length > 0 ? (
            filteredArticles.map((article, index) => (
              <button
                className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-zinc-100 px-4 py-5 text-left transition duration-200 hover:bg-zinc-50 hover:opacity-80"
                key={`${article.title}-${index}`}
                onClick={() => openArticle(article)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-[15px] leading-snug font-bold text-zinc-950">
                    {article.title}
                  </span>
                  <span className="mt-1.5 line-clamp-2 block text-[13px] leading-relaxed text-zinc-700">
                    {article.excerpt}
                  </span>
                  <span className="mt-2.5 block text-[13px] text-zinc-500">
                    Article
                  </span>
                </span>
                <ChevronRightIcon className="size-5 shrink-0 text-zinc-950" />
              </button>
            ))
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-zinc-950">
                No articles found
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Try another search or start an AI chat from Home.
              </p>
            </div>
          )}
        </div>
      </div>

      <WidgetFooter />
    </>
  )
}
