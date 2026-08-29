"use client"

import { useMemo, useState } from "react"
import {
  ClipboardCopyIcon,
  ClipboardPasteIcon,
  HistoryIcon,
  RotateCcwIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"

export type WidgetSettingsVersionSummary = {
  version: number
  publishedAt: number
  publishedBy?: string
  action: "publish" | "rollback" | "bootstrap"
  sourceVersion?: number
}

export const describeVersionAction = (
  version: WidgetSettingsVersionSummary
) => {
  if (version.action === "rollback") {
    return version.sourceVersion
      ? `Rolled back to v${version.sourceVersion}`
      : "Rolled back"
  }

  return version.action === "bootstrap" ? "Initial version" : "Published"
}

/**
 * Release history, rollback and cross-environment transfer.
 *
 * These are infrequent, consequential actions, so they live in a drawer rather
 * than stacked under the section nav where they competed with the editor for
 * attention every time someone changed a colour.
 */
export const ReleaseDrawer = ({
  open,
  onOpenChange,
  versions,
  publishedVersion,
  publishedAt,
  draftUpdatedAt,
  formatRelativeTime,
  isBusy,
  isRollingBack,
  onRollback,
  onCopySettings,
  onImportSettings,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  versions: WidgetSettingsVersionSummary[]
  publishedVersion: number
  publishedAt?: number
  draftUpdatedAt?: number
  formatRelativeTime: (timestamp?: number) => string
  isBusy: boolean
  isRollingBack: boolean
  onRollback: (version: number) => void
  onCopySettings: () => void
  onImportSettings: () => void
}) => {
  const rollbackCandidates = useMemo(
    () => versions.filter((version) => version.version !== publishedVersion),
    [versions, publishedVersion]
  )
  const [selectedVersion, setSelectedVersion] = useState<string>("")

  const effectiveSelection =
    selectedVersion ||
    (rollbackCandidates[0] ? String(rollbackCandidates[0].version) : "")

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
        side="right"
      >
        <SheetHeader className="border-b border-[var(--console-hairline-soft)] px-5 py-4">
          <SheetTitle className="console-section-title">Releases</SheetTitle>
          <SheetDescription className="text-xs">
            Every publish is versioned. Roll back to any earlier version, or
            move this widget&apos;s settings to another organization.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-5 py-5">
          <div className="console-inset grid grid-cols-2 divide-x divide-[var(--console-hairline-soft)] overflow-hidden">
            <div className="px-4 py-3">
              <p className="console-label">Live version</p>
              <p className="console-numeral mt-1.5 text-base">
                v{publishedVersion}
              </p>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {formatRelativeTime(publishedAt)}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="console-label">Draft saved</p>
              <p className="mt-1.5 truncate text-sm font-medium">
                {formatRelativeTime(draftUpdatedAt)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Autosaved as you edit
              </p>
            </div>
          </div>

          <section>
            <div className="flex items-center gap-2">
              <RotateCcwIcon className="size-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-foreground">
                Roll back
              </h3>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Republishes an earlier version as a new one, so the history stays
              intact.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Select
                disabled={isBusy || rollbackCandidates.length === 0}
                onValueChange={setSelectedVersion}
                value={effectiveSelection}
              >
                <SelectTrigger className="h-9 w-full border-[var(--console-hairline-soft)] text-xs">
                  <SelectValue placeholder="Select a version" />
                </SelectTrigger>
                <SelectContent>
                  {rollbackCandidates.map((version) => (
                    <SelectItem
                      key={version.version}
                      value={String(version.version)}
                    >
                      v{version.version} · {describeVersionAction(version)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="h-9 w-full gap-1.5 text-xs"
                disabled={isBusy || !effectiveSelection}
                onClick={() => onRollback(Number(effectiveSelection))}
                type="button"
                variant="outline"
              >
                <RotateCcwIcon className="size-3.5" />
                {isRollingBack ? "Rolling back…" : "Roll back"}
              </Button>
              {rollbackCandidates.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  Publish an update to enable rollback.
                </p>
              ) : null}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2">
              <ClipboardCopyIcon className="size-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-foreground">
                Transfer
              </h3>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Copy these settings and paste them into another organization or
              environment. Knowledge base, workflows and API keys move through{" "}
              <a className="underline" href="/org-transfer">
                Data transfer
              </a>
              .
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button
                className="h-9 gap-1.5 text-xs"
                disabled={isBusy}
                onClick={onCopySettings}
                type="button"
                variant="outline"
              >
                <ClipboardCopyIcon className="size-3.5" />
                Copy settings
              </Button>
              <Button
                className="h-9 gap-1.5 text-xs"
                disabled={isBusy}
                onClick={onImportSettings}
                type="button"
                variant="outline"
              >
                <ClipboardPasteIcon className="size-3.5" />
                Import settings
              </Button>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2">
              <HistoryIcon className="size-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-foreground">History</h3>
            </div>
            <ol className="mt-3 space-y-1.5">
              {versions.length === 0 ? (
                <li className="console-inset px-3 py-3 text-[11px] text-muted-foreground">
                  Nothing published yet.
                </li>
              ) : null}
              {versions.map((version) => {
                const isLive = version.version === publishedVersion

                return (
                  <li
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5",
                      isLive
                        ? "border-primary/35 bg-primary/[0.05]"
                        : "border-[var(--console-hairline-soft)] bg-muted/25"
                    )}
                    key={version.version}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="console-numeral shrink-0 text-xs">
                        v{version.version}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {describeVersionAction(version)}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isLive ? (
                        <span className="console-tone-wash console-tone-positive rounded-full border px-1.5 py-px text-[10px] font-medium">
                          Live
                        </span>
                      ) : null}
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(version.publishedAt)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
