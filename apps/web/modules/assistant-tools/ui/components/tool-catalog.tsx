"use client"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import {
  ArrowUpRightIcon,
  CheckIcon,
  KeyRoundIcon,
  LockIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  UnlockIcon,
} from "lucide-react"
import { useState } from "react"

import {
  ConsoleSearch,
  EmptyState,
  Pill,
  toneClass,
} from "@/modules/dashboard/ui/components/console"
import {
  CATALOG_CATEGORIES,
  EFFECT_LABELS,
  FEATURED_BLUEPRINTS,
  TOOL_BLUEPRINTS,
  type CatalogCategoryId,
  type ToolBlueprint,
} from "../../catalog"
import { AUTH_KIND_LABELS } from "../../lib/tool-auth"
import { BlueprintDetailSheet } from "./blueprint-detail-sheet"
import { BrandMark, brandStyle } from "./brand-mark"

/**
 * The offerings surface: what this assistant could be doing, ordered so an
 * operator can find a vendor by name, by job, or by browsing.
 *
 * A card never installs blindly — it opens the vendor's detail sheet, which is
 * where the credential requirement and the outgoing request are stated before
 * anything is added to the workspace.
 */

type CategoryFilter = CatalogCategoryId | "all"

type ToolCatalogProps = {
  query: string
  onQueryChange: (value: string) => void
  category: CategoryFilter
  onCategoryChange: (value: CategoryFilter) => void
  /** How many installed tools each blueprint accounts for. */
  installedCounts: Record<string, number>
  isGoogleConnected: boolean
  onInstall: (blueprint: ToolBlueprint) => void
  onConfigureBuiltin: (blueprint: ToolBlueprint) => void
  onConnectGoogle: () => void
}

const matchesQuery = (blueprint: ToolBlueprint, query: string) => {
  if (!query) return true

  const haystack = [
    blueprint.title,
    blueprint.vendor,
    blueprint.summary,
    ...blueprint.tags,
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(query)
}

const effectTone = (blueprint: ToolBlueprint) =>
  blueprint.effect === "read"
    ? "info"
    : blueprint.effect === "write"
      ? "warning"
      : "accent"

/* ── cards ──────────────────────────────────────────────────────────────── */

const BlueprintCard = ({
  blueprint,
  installedCount,
  isGoogleConnected,
  onOpen,
  onInstall,
  onConfigureBuiltin,
  onConnectGoogle,
}: {
  blueprint: ToolBlueprint
  installedCount: number
  isGoogleConnected: boolean
  onOpen: (blueprint: ToolBlueprint) => void
  onInstall: (blueprint: ToolBlueprint) => void
  onConfigureBuiltin: (blueprint: ToolBlueprint) => void
  onConnectGoogle: () => void
}) => {
  const Icon = blueprint.icon
  const isPlanned = blueprint.status === "planned"
  const isIncluded = blueprint.status === "included"
  const needsGoogle = Boolean(blueprint.requiresGoogle) && !isGoogleConnected
  const needsCredential =
    blueprint.auth && blueprint.auth.kind !== "none" ? blueprint.auth : null

  return (
    <article
      className={cn(
        "brand-edge group relative flex min-w-0 cursor-pointer flex-col p-4 text-left",
        isPlanned
          ? "console-card-quiet"
          : "console-card console-interactive hover:-translate-y-0.5"
      )}
      onClick={() => onOpen(blueprint)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpen(blueprint)
        }
      }}
      role="button"
      style={brandStyle(blueprint.brand)}
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <BrandMark brand={blueprint.brand} icon={Icon} muted={isPlanned} />

        <div className="min-w-0 flex-1">
          <p className="console-eyebrow truncate">{blueprint.vendor}</p>
          <h3 className="console-section-title mt-1.5 truncate">
            {blueprint.title}
          </h3>
        </div>

        {isIncluded ? (
          <Pill icon={CheckIcon} tone="positive">
            Included
          </Pill>
        ) : isPlanned ? (
          <Pill icon={LockIcon} tone="neutral">
            Roadmap
          </Pill>
        ) : installedCount > 0 ? (
          <Pill tone="positive">{installedCount} active</Pill>
        ) : null}
      </div>

      <p
        className={cn(
          "mt-3 line-clamp-2 text-xs leading-relaxed",
          isPlanned ? "text-muted-foreground/80" : "text-muted-foreground"
        )}
      >
        {blueprint.summary}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[0.68rem] font-medium",
            toneClass[effectTone(blueprint)]
          )}
        >
          <span className="console-dot" aria-hidden />
          {EFFECT_LABELS[blueprint.effect]}
        </span>
        {needsCredential ? (
          <span className="inline-flex items-center gap-1 text-[0.68rem] text-muted-foreground">
            <KeyRoundIcon className="size-3" />
            {AUTH_KIND_LABELS[needsCredential.kind]}
          </span>
        ) : isPlanned ? null : (
          <span className="inline-flex items-center gap-1 text-[0.68rem] text-muted-foreground">
            <UnlockIcon className="size-3" />
            No credential
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="text-[0.72rem] text-muted-foreground transition-colors group-hover:text-foreground">
          View details
        </span>

        {isPlanned ? null : isIncluded ? (
          <Button
            className="shrink-0"
            onClick={(event) => {
              event.stopPropagation()
              onConfigureBuiltin(blueprint)
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <SlidersHorizontalIcon />
            Configure
          </Button>
        ) : needsGoogle ? (
          <Button
            className="shrink-0"
            onClick={(event) => {
              event.stopPropagation()
              onConnectGoogle()
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Connect Google
          </Button>
        ) : (
          <Button
            className="shrink-0"
            onClick={(event) => {
              event.stopPropagation()
              onInstall(blueprint)
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <PlusIcon />
            Add
          </Button>
        )}
      </div>
    </article>
  )
}

const SpotlightCard = ({
  blueprint,
  onOpen,
}: {
  blueprint: ToolBlueprint
  onOpen: (blueprint: ToolBlueprint) => void
}) => {
  const Icon = blueprint.icon

  return (
    <button
      className="brand-edge console-card console-interactive flex min-w-0 items-start gap-3 p-3.5 text-left"
      onClick={() => onOpen(blueprint)}
      style={brandStyle(blueprint.brand)}
      type="button"
    >
      <BrandMark brand={blueprint.brand} icon={Icon} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="console-section-title truncate text-[0.82rem]">
            {blueprint.title}
          </span>
          <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </span>
        <span className="mt-1 line-clamp-2 block text-[0.72rem] leading-snug text-muted-foreground">
          {blueprint.summary}
        </span>
      </span>
    </button>
  )
}

/* ── surface ────────────────────────────────────────────────────────────── */

export const ToolCatalog = ({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  installedCounts,
  isGoogleConnected,
  onInstall,
  onConfigureBuiltin,
  onConnectGoogle,
}: ToolCatalogProps) => {
  const [detailBlueprint, setDetailBlueprint] = useState<ToolBlueprint | null>(
    null
  )
  const normalizedQuery = query.trim().toLowerCase()

  const visible = TOOL_BLUEPRINTS.filter(
    (blueprint) =>
      (category === "all" || blueprint.category === category) &&
      matchesQuery(blueprint, normalizedQuery)
  )

  const ready = visible.filter((blueprint) => blueprint.status !== "planned")
  const planned = visible.filter((blueprint) => blueprint.status === "planned")
  const showSpotlight = category === "all" && !normalizedQuery

  const categoryCount = (id: CategoryFilter) =>
    TOOL_BLUEPRINTS.filter(
      (blueprint) =>
        (id === "all" || blueprint.category === id) &&
        matchesQuery(blueprint, normalizedQuery)
    ).length

  const filters: Array<{
    id: CategoryFilter
    label: string
    description: string
    icon: ToolBlueprint["icon"]
  }> = [
    {
      id: "all",
      label: "Everything",
      description: "Every offering, shippable and planned.",
      icon: SparklesIcon,
    },
    ...CATALOG_CATEGORIES.map((entry) => ({
      id: entry.id as CategoryFilter,
      label: entry.label,
      description: entry.description,
      icon: entry.icon,
    })),
  ]

  const activeCategory = filters.find((filter) => filter.id === category)

  const openDetail = (blueprint: ToolBlueprint) => setDetailBlueprint(blueprint)

  const handleInstall = (blueprint: ToolBlueprint) => {
    setDetailBlueprint(null)
    onInstall(blueprint)
  }

  const handleConfigureBuiltin = (blueprint: ToolBlueprint) => {
    setDetailBlueprint(null)
    onConfigureBuiltin(blueprint)
  }

  const handleConnectGoogle = () => {
    setDetailBlueprint(null)
    onConnectGoogle()
  }

  return (
    <div className="flex flex-col gap-5">
      {showSpotlight && FEATURED_BLUEPRINTS.length > 0 ? (
        <section className="space-y-2.5">
          <div className="flex items-center gap-3">
            <p className="console-label">Start here</p>
            <div className="console-rule flex-1" />
            <span className="console-numeral text-[0.66rem] text-muted-foreground">
              Common first integrations
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {FEATURED_BLUEPRINTS.slice(0, 6).map((blueprint) => (
              <SpotlightCard
                blueprint={blueprint}
                key={blueprint.id}
                onOpen={openDetail}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-5 lg:flex-row">
        <aside className="shrink-0 lg:w-[15.5rem]">
          <div className="console-card overflow-hidden">
            <p className="console-label border-b border-[var(--console-hairline-soft)] px-3.5 py-3">
              Browse
            </p>
            <div className="p-2">
              {filters.map((filter) => {
                const FilterIcon = filter.icon
                const isActive = category === filter.id

                return (
                  <button
                    className={cn(
                      "console-row flex w-full items-center gap-2.5 rounded-[10px] border px-2.5 py-2 text-left",
                      isActive
                        ? "border-[var(--console-hairline)] bg-muted/70"
                        : "border-transparent"
                    )}
                    key={filter.id}
                    onClick={() => onCategoryChange(filter.id)}
                    type="button"
                  >
                    <FilterIcon
                      className={cn(
                        "size-4 shrink-0",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[0.8rem] font-medium",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {filter.label}
                    </span>
                    <span className="console-numeral text-[0.66rem] text-muted-foreground">
                      {categoryCount(filter.id)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="console-section-title truncate">
                {activeCategory?.label ?? "Everything"}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {activeCategory?.description}
              </p>
            </div>
            <ConsoleSearch
              aria-label="Search the tool catalog"
              className="sm:w-72"
              onChange={onQueryChange}
              placeholder="Search vendors and actions…"
              value={query}
            />
          </div>

          {ready.length === 0 && planned.length === 0 ? (
            <div className="console-card">
              <EmptyState
                action={
                  <Button
                    onClick={() => {
                      onQueryChange("")
                      onCategoryChange("all")
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Clear filters
                  </Button>
                }
                description="Nothing in the catalog matches that. Anything with an HTTP endpoint can still be added as a REST tool."
                icon={SparklesIcon}
                title="No match"
              />
            </div>
          ) : null}

          {ready.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {ready.map((blueprint) => (
                <BlueprintCard
                  blueprint={blueprint}
                  installedCount={installedCounts[blueprint.id] ?? 0}
                  isGoogleConnected={isGoogleConnected}
                  key={blueprint.id}
                  onConfigureBuiltin={handleConfigureBuiltin}
                  onConnectGoogle={handleConnectGoogle}
                  onInstall={handleInstall}
                  onOpen={openDetail}
                />
              ))}
            </div>
          ) : null}

          {planned.length > 0 ? (
            <section className="flex flex-col gap-3 pt-1">
              <div className="flex items-center gap-3">
                <p className="console-label">On the roadmap</p>
                <div className="console-rule flex-1" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {planned.map((blueprint) => (
                  <BlueprintCard
                    blueprint={blueprint}
                    installedCount={0}
                    isGoogleConnected={isGoogleConnected}
                    key={blueprint.id}
                    onConfigureBuiltin={handleConfigureBuiltin}
                    onConnectGoogle={handleConnectGoogle}
                    onInstall={handleInstall}
                    onOpen={openDetail}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <BlueprintDetailSheet
        blueprint={detailBlueprint}
        installedCount={
          detailBlueprint ? (installedCounts[detailBlueprint.id] ?? 0) : 0
        }
        isGoogleConnected={isGoogleConnected}
        onConfigureBuiltin={handleConfigureBuiltin}
        onConnectGoogle={handleConnectGoogle}
        onInstall={handleInstall}
        onOpenChange={(open) => {
          if (!open) setDetailBlueprint(null)
        }}
        open={detailBlueprint !== null}
      />
    </div>
  )
}
