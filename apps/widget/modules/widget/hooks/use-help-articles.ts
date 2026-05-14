"use client"

import { useMemo } from "react"
import { useAtomValue } from "jotai"
import {
  widgetSettingsAtom,
  type WidgetHelpArticle,
  type WidgetHelpTopic,
  type WidgetHomeHelpCard,
} from "@/modules/widget/atoms/widget-atoms"
import { mergeWidgetAppearance } from "@workspace/ui/lib/widget-customization"

const fallbackHelpTopics: WidgetHelpTopic[] = [
  {
    title: "Getting started",
    excerpt: "Setup guides and first steps for new users.",
    articles: [
      {
        title: "How do I get started?",
        excerpt:
          "Learn the fastest way to begin and get value from the product.",
        body: "Getting started is simple:\n\n1. Create your account and complete the first setup steps.\n2. Add your key details so the assistant can understand your needs.\n3. Open chat if you need help with a specific question.",
      },
      {
        title: "What should I do first?",
        excerpt: "A quick checklist for the first useful actions.",
        body: "Start with the most important setup items first.\n\nConfirm your profile, review the available tools, and ask the assistant any product-specific question you have.",
      },
      {
        title: "Where can I ask questions?",
        excerpt: "Find the best place to get help in the widget.",
        body: "Use the Help tab for written articles. Use Messages or Start AI chat when you want a conversational answer.",
      },
    ],
  },
  {
    title: "Billing and plans",
    excerpt: "Plan, billing, and subscription information.",
    articles: [
      {
        title: "What are your pricing plans?",
        excerpt:
          "Review where to find plan, billing, and subscription information.",
        body: "Pricing depends on the plan and features enabled for your organization.\n\nYou can check the current plan from your account or billing page.",
      },
      {
        title: "How do I update billing?",
        excerpt: "Learn where billing details are managed.",
        body: "Billing details are usually managed from your account billing page.\n\nIf you cannot find it, start an AI chat and ask for billing help.",
      },
      {
        title: "Can I change my plan?",
        excerpt: "Understand the next step for upgrades or changes.",
        body: "Plan changes depend on your organization settings.\n\nContact support or start an AI chat with the plan you want to change to.",
      },
    ],
  },
  {
    title: "Account help",
    excerpt: "Login, access, and profile issue guidance.",
    articles: [
      {
        title: "I need help with my account",
        excerpt:
          "Find the best next step for login, access, or profile issues.",
        body: "For account help, first confirm that your email address and organization are correct.\n\nIf you cannot access something, start an AI chat with the details of the issue.",
      },
      {
        title: "I cannot log in",
        excerpt: "Troubleshoot login and access problems.",
        body: "Check that you are using the right email address and organization.\n\nIf login still fails, include the error message when you contact support.",
      },
      {
        title: "How do I update my profile?",
        excerpt: "Find where your personal account details live.",
        body: "Profile settings are managed in your account area.\n\nIf you do not see the field you need, ask the assistant for help.",
      },
    ],
  },
]

const cleanArticle = (article: WidgetHelpArticle): WidgetHelpArticle => ({
  title: article.title.trim(),
  excerpt: article.excerpt.trim(),
  body: article.body.trim(),
})

type LegacyHelpTopic = {
  title: string
  excerpt: string
  articles: {
    article1: WidgetHelpArticle
    article2: WidgetHelpArticle
    article3: WidgetHelpArticle
  }
}

type LegacyHelpTopics = {
  topic1: LegacyHelpTopic
  topic2: LegacyHelpTopic
  topic3: LegacyHelpTopic
}

const isLegacyHelpTopics = (value: unknown): value is LegacyHelpTopics =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  "topic1" in value &&
  "topic2" in value &&
  "topic3" in value

const helpTopicsToArray = (value: unknown): WidgetHelpTopic[] => {
  if (Array.isArray(value)) {
    return value
  }

  if (!isLegacyHelpTopics(value)) {
    return fallbackHelpTopics
  }

  return [value.topic1, value.topic2, value.topic3].map((topic) => ({
    title: topic.title,
    excerpt: topic.excerpt,
    articles: [
      topic.articles.article1,
      topic.articles.article2,
      topic.articles.article3,
    ],
  }))
}

type HomeCardSetting = {
  type?: unknown
  topicIndex?: unknown
  articleIndex?: unknown
}

const isHomeCardSettings = (value: unknown): value is HomeCardSetting[] =>
  Array.isArray(value)

const resolveHomeCards = (
  value: unknown,
  topics: WidgetHelpTopic[]
): WidgetHomeHelpCard[] => {
  const configuredCards = isHomeCardSettings(value) ? value : null
  const fallbackCards = topics.reduce<HomeCardSetting[]>(
    (cards, topic, topicIndex) => {
      if (cards.length >= 3 || !topic.articles[0]) return cards

      cards.push({
        type: "article",
        topicIndex,
        articleIndex: 0,
      })
      return cards
    },
    []
  )

  const source: HomeCardSetting[] =
    configuredCards && configuredCards.length ? configuredCards : fallbackCards

  const cards = source.reduce<WidgetHomeHelpCard[]>((items, card) => {
    const topicIndex = Number(card.topicIndex)
    if (!Number.isInteger(topicIndex) || topicIndex < 0) return items

    const topic = topics[topicIndex]
    if (!topic) return items

    const articleIndex = Number(card.articleIndex ?? 0)
    if (!Number.isInteger(articleIndex) || articleIndex < 0) return items

    const article = topic.articles[articleIndex]
    if (!article) return items
    items.push({
      type: "article" as const,
      topic,
      article,
    })
    return items
  }, [])

  return cards.length
    ? cards
    : topics.reduce<WidgetHomeHelpCard[]>((items, topic) => {
        if (items.length >= 3 || !topic.articles[0]) return items

        items.push({
          type: "article" as const,
          topic,
          article: topic.articles[0],
        })
        return items
      }, [])
}

export const useHelpTopics = () => {
  const widgetSettings = useAtomValue(widgetSettingsAtom)

  return useMemo(() => {
    const appearance = mergeWidgetAppearance(widgetSettings?.appearance)
    if (!appearance.showHelpCenter) {
      return []
    }

    const topics = widgetSettings?.helpTopics
      ? helpTopicsToArray(widgetSettings.helpTopics)
      : fallbackHelpTopics

    return topics
      .map((topic) => ({
        title: topic.title.trim(),
        excerpt: topic.excerpt.trim(),
        articles: topic.articles
          .map(cleanArticle)
          .filter(
            (article) => article.title && article.excerpt && article.body
          ),
      }))
      .filter((topic) => topic.title && topic.excerpt && topic.articles.length)
  }, [widgetSettings?.appearance, widgetSettings?.helpTopics])
}

export const useHelpArticles = () => {
  const topics = useHelpTopics()

  return useMemo(() => topics.flatMap((topic) => topic.articles), [topics])
}

export const useHomeHelpCards = () => {
  const widgetSettings = useAtomValue(widgetSettingsAtom)
  const topics = useHelpTopics()

  return useMemo(() => {
    return resolveHomeCards(widgetSettings?.homeCards, topics)
  }, [topics, widgetSettings?.homeCards])
}
