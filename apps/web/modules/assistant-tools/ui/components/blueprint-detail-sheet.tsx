"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { cn } from "@workspace/ui/lib/utils"
import {
  ArrowUpRightIcon,
  AudioLinesIcon,
  CheckIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  LockIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
} from "lucide-react"
import { useMemo } from "react"

import { Pill, toneClass } from "@/modules/dashboard/ui/components/console"
import {
  CATALOG_CATEGORY_LABELS,
  EFFECT_LABELS,
  type ToolBlueprint,
} from "../../catalog"
import { AUTH_KIND_LABELS } from "../../lib/tool-auth"
import { BrandMark } from "./brand-mark"
import { RequestPreview } from "./request-preview"

/**
 * The vendor page for one offering.
 *
 * Everything an operator needs before they commit: what the tool does, which
 * credential it will ask for, the arguments the model gets to fill, and the
 * exact request that leaves the network. Installing is the last step here, not
 * the first thing you are pushed into.
 */

type BlueprintDetailSheetProps = {
  blueprint: ToolBlueprint | null
  open: boolean
  onOpenChange: (open: boolean) => void
  installedCount: number
  isGoogleConnected: boolean
  onInstall: (blueprint: ToolBlueprint) => void
  onConfigureBuiltin: (blueprint: ToolBlueprint) => void
  onConnectGoogle: () => void
}

const Section = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <section className="space-y-2.5">
    <p className="console-label">{title}</p>
    {children}
  </section>
)

export const BlueprintDetailSheet = ({
  blueprint,
  open,
  onOpenChange,
  installedCount,
  isGoogleConnected,
  onInstall,
  onConfigureBuiltin,
  onConnectGoogle,
}: BlueprintDetailSheetProps) => {
  const draft = useMemo(() => blueprint?.draft?.() ?? null, [blueprint])

  if (!blueprint) {
    return null
  }

  const Icon = blueprint.icon
  const isPlanned = blueprint.status === "planned"
  const isIncluded = blueprint.status === "included"
  const needsGoogle = Boolean(blueprint.requiresGoogle) && !isGoogleConnected

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl" side="right">
        <SheetHeader className="gap-0 border-b border-[var(--console-hairline-soft)] p-5">
          <div className="flex items-start gap-3.5 pr-8">
            <BrandMark
              brand={blueprint.brand}
              icon={Icon}
              muted={isPlanned}
              size="lg"
            />
            <div className="min-w-0">
              <p className="console-eyebrow truncate">{blueprint.vendor}</p>
              <SheetTitle className="console-section-title mt-1.5 text-[1.05rem]">
                {blueprint.title}
              </SheetTitle>
              <SheetDescription className="mt-1.5 text-sm leading-relaxed">
                {blueprint.summary}
              </SheetDescription>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {isIncluded ? (
              <Pill icon={CheckIcon} tone="positive">
                Included
              </Pill>
            ) : isPlanned ? (
              <Pill icon={LockIcon} tone="neutral">
                On the roadmap
              </Pill>
            ) : (
              <Pill icon={ShieldCheckIcon} tone="positive">
                Ready to install
              </Pill>
            )}
            <Pill
              tone={
                blueprint.effect === "read"
                  ? "info"
                  : blueprint.effect === "write"
                    ? "warning"
                    : "accent"
              }
            >
              {EFFECT_LABELS[blueprint.effect]}
            </Pill>
            <Pill tone="neutral">
              {CATALOG_CATEGORY_LABELS[blueprint.category]}
            </Pill>
            {draft?.enabledForVoice ? (
              <Pill icon={AudioLinesIcon} tone="accent">
                Voice ready
              </Pill>
            ) : null}
            {installedCount > 0 ? (
              <Pill tone="positive">{installedCount} installed</Pill>
            ) : null}
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 p-5">
            {blueprint.highlights?.length ? (
              <Section title="What it does">
                <ul className="space-y-2">
                  {blueprint.highlights.map((highlight) => (
                    <li className="flex items-start gap-2.5" key={highlight}>
                      <CheckIcon
                        className={cn(
                          "mt-0.5 size-3.5 shrink-0",
                          toneClass.positive
                        )}
                      />
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {highlight}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {blueprint.auth ? (
              <Section title="What you'll need">
                <div className="console-inset space-y-2 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <KeyRoundIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {blueprint.auth.label}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {blueprint.auth.hint ??
                          AUTH_KIND_LABELS[blueprint.auth.kind]}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-6.5">
                    <Pill tone="neutral">
                      {AUTH_KIND_LABELS[blueprint.auth.kind]}
                    </Pill>
                    {blueprint.auth.docsUrl ? (
                      <a
                        className="inline-flex items-center gap-1 text-[0.72rem] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
                        href={blueprint.auth.docsUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Where to get it
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
                {blueprint.setupHint ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {blueprint.setupHint}
                  </p>
                ) : null}
              </Section>
            ) : null}

            {draft && draft.parameters.length > 0 ? (
              <Section title="Arguments the model fills">
                <div className="console-inset divide-y divide-[var(--console-hairline-soft)] overflow-hidden">
                  {draft.parameters.map((parameter) => (
                    <div className="px-3.5 py-2.5" key={parameter.name}>
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="font-mono text-xs font-medium text-foreground">
                          {parameter.name}
                        </code>
                        <span className="console-numeral text-[0.66rem] text-muted-foreground">
                          {parameter.type}
                        </span>
                        {parameter.required ? (
                          <span
                            className={cn("text-[0.66rem]", toneClass.accent)}
                          >
                            required
                          </span>
                        ) : (
                          <span className="text-[0.66rem] text-muted-foreground">
                            optional
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">
                        {parameter.description}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {draft && draft.type !== "google_sheets" ? (
              <Section title="The request it makes">
                <RequestPreview
                  config={draft.config}
                  parameters={draft.parameters}
                  type={draft.type}
                />
              </Section>
            ) : null}

            {isPlanned ? (
              <div className="console-inset px-3.5 py-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  This one is not shippable yet, so it cannot be installed. It
                  is listed because it is on the roadmap — not because it half
                  works.
                </p>
              </div>
            ) : null}

            {blueprint.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {blueprint.tags.map((tag) => (
                  <span
                    className="rounded-full border border-[var(--console-hairline-soft)] bg-muted/40 px-2 py-0.5 text-[0.68rem] leading-4 text-muted-foreground"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--console-hairline-soft)] p-4">
          {blueprint.docsUrl ? (
            <a
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              href={blueprint.docsUrl}
              rel="noreferrer"
              target="_blank"
            >
              Provider docs
              <ExternalLinkIcon className="size-3" />
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">
              Configured per workspace
            </span>
          )}

          {isPlanned ? null : isIncluded ? (
            <Button
              onClick={() => onConfigureBuiltin(blueprint)}
              type="button"
              variant="outline"
            >
              <SlidersHorizontalIcon />
              Configure
            </Button>
          ) : needsGoogle ? (
            <Button onClick={onConnectGoogle} type="button">
              Connect Google
              <ArrowUpRightIcon />
            </Button>
          ) : (
            <Button onClick={() => onInstall(blueprint)} type="button">
              Add to workspace
              <ArrowUpRightIcon />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
