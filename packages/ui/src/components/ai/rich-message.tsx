"use client"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Rich message payloads.
 *
 * Workflow Card and Carousel steps carry more than prose, so the runtime
 * writes them into the thread as a fenced ```osonflow-card / ```osonflow-carousel
 * block. Both the widget and the operator dashboard render messages through
 * AIResponse, so parsing the block here is what makes them show up as cards in
 * both places instead of a wall of links.
 */

export type RichButton = {
  id: string
  label: string
}

export type RichCard = {
  title?: string
  description?: string
  imageUrl?: string
  alt?: string
  buttons?: RichButton[]
}

export type RichMessagePayload =
  | { kind: "card"; card: RichCard }
  | { kind: "carousel"; intro?: string; cards: RichCard[] }

const RICH_LANGUAGE = /(?:^|\s)language-osonflow-(card|carousel)(?:\s|$)/

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const asCard = (value: unknown): RichCard | null => {
  if (typeof value !== "object" || value === null) {
    return null
  }

  const raw = value as Record<string, unknown>
  const card: RichCard = {
    title: asString(raw.title),
    description: asString(raw.description),
    imageUrl: asString(raw.imageUrl),
    alt: asString(raw.alt),
    // Older messages stored plain labels; newer ones carry the button id so
    // the surface can answer with it.
    buttons: Array.isArray(raw.buttons)
      ? raw.buttons
          .map((button): RichButton | null => {
            if (typeof button === "string") {
              const label = button.trim()
              return label ? { id: label, label } : null
            }

            if (typeof button !== "object" || button === null) {
              return null
            }

            const entry = button as Record<string, unknown>
            const label = asString(entry.label)

            return label ? { id: asString(entry.id) || label, label } : null
          })
          .filter((button): button is RichButton => button !== null)
      : [],
  }

  return card.title || card.description || card.imageUrl ? card : null
}

/** Parses a fenced code block into a rich payload, or null if it is ordinary. */
export const parseRichMessage = (
  className: string | undefined,
  source: string | undefined
): RichMessagePayload | null => {
  const match = RICH_LANGUAGE.exec(className ?? "")

  if (!match || !source?.trim()) {
    return null
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(source)
  } catch {
    return null
  }

  if (match[1] === "card") {
    const card = asCard(parsed)
    return card ? { kind: "card", card } : null
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null
  }

  const raw = parsed as Record<string, unknown>
  const cards = Array.isArray(raw.cards)
    ? raw.cards.map(asCard).filter((card): card is RichCard => card !== null)
    : []

  return cards.length > 0
    ? { kind: "carousel", intro: asString(raw.intro), cards }
    : null
}

/** Every button id the message offers, so a surface can tell whether its own
 *  choice row would just repeat what the cards already show. */
export const richButtonIds = (payloads: RichMessagePayload[]) => {
  const ids = new Set<string>()

  for (const payload of payloads) {
    const cards = payload.kind === "card" ? [payload.card] : payload.cards

    for (const card of cards) {
      for (const button of card.buttons ?? []) {
        ids.add(button.id)
      }
    }
  }

  return ids
}

const FENCE = /```osonflow-(card|carousel)\s*\n([\s\S]*?)```/g

/** Pulls every rich payload out of a raw message body. */
export const parseRichMessages = (text: string): RichMessagePayload[] => {
  const payloads: RichMessagePayload[] = []

  for (const match of text.matchAll(FENCE)) {
    const payload = parseRichMessage(`language-osonflow-${match[1]}`, match[2])

    if (payload) {
      payloads.push(payload)
    }
  }

  return payloads
}

/**
 * A one-line, human summary of a message body.
 *
 * Conversation lists show the last message as plain text, so the fenced rich
 * payloads and markdown images have to collapse into something readable rather
 * than leaking their source.
 */
export const richMessagePreview = (text: string) => {
  const withRich = text.replace(FENCE, (_match, kind: string, body: string) => {
    const payload = parseRichMessage(`language-osonflow-${kind}`, body)

    if (!payload) {
      return kind === "carousel" ? "Carousel" : "Card"
    }

    if (payload.kind === "card") {
      const { title, description } = payload.card
      return title || description || "Card"
    }

    const titles = payload.cards
      .map((card) => card.title)
      .filter((title): title is string => Boolean(title))

    return (
      [payload.intro, titles.join(", ")].filter(Boolean).join(" ") ||
      `Carousel · ${payload.cards.length} options`
    )
  })

  return withRich
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_match, alt: string) => alt || "Photo")
    .replace(/\s+/g, " ")
    .trim()
}

export type RichMessageActions = {
  /** Given, card buttons become real controls instead of static labels. */
  onButtonClick?: (button: RichButton) => void
  disabled?: boolean
}

const CardButtons = ({
  buttons,
  actions,
}: {
  buttons: RichButton[]
  actions?: RichMessageActions
}) => {
  if (!actions?.onButtonClick) {
    return (
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {buttons.map((button) => (
          <li
            className="rounded-md border px-2 py-1 text-[12px] leading-none font-medium"
            key={button.id}
          >
            {button.label}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="mt-1 grid gap-1.5">
      {buttons.map((button) => (
        <button
          className="rounded-md border px-2 py-1.5 text-[12.5px] leading-none font-medium transition-opacity hover:opacity-70 disabled:opacity-50"
          disabled={actions.disabled}
          key={button.id}
          onClick={() => actions.onButtonClick?.(button)}
          type="button"
        >
          {button.label}
        </button>
      ))}
    </div>
  )
}

const CardFace = ({
  card,
  actions,
}: {
  card: RichCard
  actions?: RichMessageActions
}) => (
  <article className="ai-rich-card overflow-hidden rounded-xl border bg-[var(--card,var(--background))]">
    {card.imageUrl ? (
      // Fixed height, cropped: a row of cards lines up whatever shape the
      // source images happen to be.
      <img
        alt={card.alt || card.title || ""}
        className="block h-[132px] w-full bg-black/5 object-cover"
        loading="lazy"
        src={card.imageUrl}
      />
    ) : null}
    {card.title || card.description || card.buttons?.length ? (
      <div className="grid gap-1 px-3 py-2.5">
        {card.title ? (
          <h4 className="text-[13.5px] leading-snug font-semibold">
            {card.title}
          </h4>
        ) : null}
        {card.description ? (
          <p className="text-[13.5px] leading-snug text-muted-foreground">
            {card.description}
          </p>
        ) : null}
        {card.buttons?.length ? (
          <CardButtons actions={actions} buttons={card.buttons} />
        ) : null}
      </div>
    ) : null}
  </article>
)

export const RichMessage = ({
  payload,
  className,
  actions,
}: {
  payload: RichMessagePayload
  className?: string
  actions?: RichMessageActions
}) => {
  if (payload.kind === "card") {
    return (
      <div className={cn("my-1 max-w-[280px]", className)}>
        <CardFace actions={actions} card={payload.card} />
      </div>
    )
  }

  return (
    <div className={cn("my-1 grid gap-2", className)}>
      {payload.intro ? (
        <p className="text-[13.5px] leading-snug">{payload.intro}</p>
      ) : null}
      {/* Horizontal, like every other carousel: one card visible, swipe for more. */}
      <div className="ai-rich-carousel -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
        {payload.cards.map((card, index) => (
          <div
            className="w-[208px] shrink-0 snap-start"
            key={`${card.title ?? "card"}-${index}`}
          >
            <CardFace actions={actions} card={card} />
          </div>
        ))}
      </div>
    </div>
  )
}
