"use client"

import { useEffect, useMemo, useRef, type FormEvent } from "react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  helpSearchQueryAtom,
  screenAtom,
  selectedHelpArticleAtom,
  selectedHelpTopicAtom,
  type WidgetHelpArticle,
} from "../../atoms/widget-atoms"
import { WidgetFooter } from "../components/widget-footer"

export const WidgetTopicScreen = () => {
  const setScreen = useSetAtom(screenAtom)
  const topic = useAtomValue(selectedHelpTopicAtom)
  const setSelectedHelpArticle = useSetAtom(selectedHelpArticleAtom)
  const [searchQuery, setSearchQuery] = useAtom(helpSearchQueryAtom)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!topic) {
      setScreen("help")
    }
  }, [topic, setScreen])

  const filteredArticles = useMemo(() => {
    if (!topic) return []

    const query = searchQuery.trim().toLowerCase()
    if (!query) return topic.articles

    return topic.articles.filter((article) =>
      [topic.title, topic.excerpt, article.title, article.excerpt, article.body]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  }, [searchQuery, topic])

  if (!topic) {
    return null
  }

  const openArticle = (article: WidgetHelpArticle) => {
    setSelectedHelpArticle(article)
    setScreen("article")
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (filteredArticles.length === 1 && filteredArticles[0]) {
      openArticle(filteredArticles[0])
    } else {
      searchInputRef.current?.focus()
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <header className="shrink-0 px-4 pt-4 pb-3.5">
          <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
            <Button
              aria-label="Back to help"
              className="size-9 rounded-full text-zinc-600 hover:bg-zinc-100"
              onClick={() => setScreen("help")}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <h1 className="text-center text-xl font-bold tracking-tight">
              Help
            </h1>
            <Button
              aria-label="Close topic"
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
              aria-label={`Search ${topic.title}`}
              className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus:placeholder:text-transparent focus-visible:ring-0"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search for help"
              ref={searchInputRef}
              value={searchQuery}
            />
            <Button
              aria-label="Search this topic"
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
          <section className="px-5 py-5">
            <h1 className="text-xl leading-tight font-extrabold tracking-tight text-zinc-950">
              {topic.title}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-zinc-700">
              {topic.excerpt}
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              {topic.articles.length} articles
            </p>
          </section>

          <div className="border-t border-zinc-100">
            {filteredArticles.length > 0 ? (
              filteredArticles.map((article) => (
                <button
                  className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 text-left transition duration-200 hover:bg-zinc-50 hover:opacity-80"
                  key={article.title}
                  onClick={() => openArticle(article)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block text-[15px] leading-snug font-semibold text-zinc-950">
                      {article.title}
                    </span>
                    <span className="mt-1.5 line-clamp-2 block text-[13px] leading-relaxed text-zinc-600">
                      {article.excerpt}
                    </span>
                  </span>
                  <ChevronRightIcon className="size-5 shrink-0 text-zinc-950" />
                </button>
              ))
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-semibold text-zinc-950">
                  No articles found
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Try another search in this topic.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <WidgetFooter />
    </>
  )
}
