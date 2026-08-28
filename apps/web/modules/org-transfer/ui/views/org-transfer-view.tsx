"use client"

import { useAction } from "convex/react"
import { ConvexError } from "convex/values"
import { api } from "@workspace/backend/_generated/api"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import {
  ArrowLeftRightIcon,
  ClipboardCopyIcon,
  ClipboardPasteIcon,
  DownloadIcon,
  Loader2Icon,
  UploadIcon,
} from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { copyTextToClipboard } from "@/lib/clipboard"
import {
  ConsoleHeader,
  ConsolePage,
} from "@/modules/dashboard/ui/components/console"

type ExportSummary = {
  widgetSettings: boolean
  knowledgeBaseCount: number
  savedRepliesCount: number
  workflowsCount: number
  pluginsCount: number
  integrationWebhooksCount: number
}

type ImportSummary = {
  widgetSettings: boolean
  publishedWidgetSettings: boolean
  knowledgeBaseImported: number
  knowledgeBaseSkipped: number
  knowledgeBaseCleared: number
  savedReplies: number
  workflows: number
  plugins: number
  integrationWebhooks: number
  warnings?: string[]
}

const getTransferErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ConvexError) {
    if (typeof error.data === "string" && error.data.trim()) {
      return error.data
    }

    if (
      error.data &&
      typeof error.data === "object" &&
      "message" in error.data &&
      typeof error.data.message === "string" &&
      error.data.message.trim()
    ) {
      return error.data.message
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

const formatSummaryLines = (summary: ExportSummary | ImportSummary) => {
  const lines: string[] = []

  if ("widgetSettings" in summary && summary.widgetSettings) {
    lines.push("Widget customization")
  }

  if ("publishedWidgetSettings" in summary && summary.publishedWidgetSettings) {
    lines.push("Published widget settings")
  }

  if ("knowledgeBaseCount" in summary && summary.knowledgeBaseCount > 0) {
    lines.push(`${summary.knowledgeBaseCount} knowledge sources`)
  }

  if ("knowledgeBaseImported" in summary && summary.knowledgeBaseImported > 0) {
    lines.push(`${summary.knowledgeBaseImported} knowledge sources imported`)
  }

  if ("knowledgeBaseSkipped" in summary && summary.knowledgeBaseSkipped > 0) {
    lines.push(`${summary.knowledgeBaseSkipped} duplicate knowledge sources skipped`)
  }

  if ("knowledgeBaseCleared" in summary && summary.knowledgeBaseCleared > 0) {
    lines.push(`${summary.knowledgeBaseCleared} existing knowledge sources removed`)
  }

  if ("savedRepliesCount" in summary && summary.savedRepliesCount > 0) {
    lines.push(`${summary.savedRepliesCount} saved replies`)
  }

  if ("savedReplies" in summary && summary.savedReplies > 0) {
    lines.push(`${summary.savedReplies} saved replies imported`)
  }

  if ("workflowsCount" in summary && summary.workflowsCount > 0) {
    lines.push(`${summary.workflowsCount} workflows`)
  }

  if ("workflows" in summary && summary.workflows > 0) {
    lines.push(`${summary.workflows} workflows imported`)
  }

  if ("pluginsCount" in summary && summary.pluginsCount > 0) {
    lines.push(`${summary.pluginsCount} integration keys`)
  }

  if ("plugins" in summary && summary.plugins > 0) {
    lines.push(`${summary.plugins} integration keys imported`)
  }

  if (
    "integrationWebhooksCount" in summary &&
    summary.integrationWebhooksCount > 0
  ) {
    lines.push(`${summary.integrationWebhooksCount} outbound webhooks`)
  }

  if ("integrationWebhooks" in summary && summary.integrationWebhooks > 0) {
    lines.push(`${summary.integrationWebhooks} outbound webhooks imported`)
  }

  return lines
}

export const OrgTransferView = () => {
  const exportBundle = useAction(api.private.orgTransfer.exportBundle)
  const importBundle = useAction(api.private.orgTransfer.importBundle)

  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importPayload, setImportPayload] = useState("")
  const [lastExportJson, setLastExportJson] = useState<string | null>(null)
  const [lastExportSummary, setLastExportSummary] =
    useState<ExportSummary | null>(null)
  const [publishWidgetSettings, setPublishWidgetSettings] = useState(true)
  const [replaceKnowledgeBase, setReplaceKnowledgeBase] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onExport = async () => {
    setIsExporting(true)

    try {
      const result = await exportBundle({})
      const json = JSON.stringify(result.bundle, null, 2)
      const summaryText =
        formatSummaryLines(result.summary).join(" · ") || "No data found"

      setLastExportJson(json)
      setLastExportSummary(result.summary)

      const copied = await copyTextToClipboard(json)

      if (copied) {
        toast.success("Organization bundle copied to clipboard", {
          description: summaryText,
        })
      } else {
        toast.success("Organization bundle exported", {
          description: `${summaryText}. Clipboard unavailable — use Download JSON.`,
        })
      }
    } catch (error) {
      toast.error(
        getTransferErrorMessage(error, "Failed to export organization data")
      )
    } finally {
      setIsExporting(false)
    }
  }

  const onDownload = () => {
    if (!lastExportJson) {
      toast.error("Export organization data first")
      return
    }

    const blob = new Blob([lastExportJson], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `osonflow-org-bundle-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success("Bundle downloaded")
  }

  const onOpenImportDialog = () => {
    setIsImportDialogOpen(true)

    if (importPayload.trim()) {
      return
    }

    void navigator.clipboard
      .readText()
      .then((clipboardText) => {
        if (clipboardText.trim()) {
          setImportPayload(clipboardText)
        } else if (lastExportJson) {
          setImportPayload(lastExportJson)
        }
      })
      .catch(() => {
        if (lastExportJson) {
          setImportPayload(lastExportJson)
        }
      })
  }

  const onPickBundleFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    try {
      const text = await file.text()
      setImportPayload(text)
      setIsImportDialogOpen(true)
    } catch {
      toast.error("Could not read that JSON file")
    }
  }

  const onImport = async () => {
    setIsImporting(true)

    try {
      const result = await importBundle({
        bundleJson: importPayload,
        options: {
          publishWidgetSettings,
          replaceKnowledgeBase,
        },
      })

      setIsImportDialogOpen(false)
      setImportPayload("")

      const importedText =
        formatSummaryLines(result.summary).join(" · ") || "Nothing was imported"
      const warnings = result.summary.warnings ?? []

      if (warnings.length > 0) {
        toast.success("Organization bundle imported with warnings", {
          description: `${importedText}. ${warnings[0]}`,
        })
      } else {
        toast.success("Organization bundle imported", {
          description: importedText,
        })
      }
    } catch (error) {
      toast.error(
        getTransferErrorMessage(error, "Failed to import organization data")
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <ConsolePage width="narrow" className="max-w-5xl">
      <ConsoleHeader
        description="Export this organization's configuration before switching Convex environments, or paste it into another Clerk organization. Covers widget customization, knowledge base sources, saved replies, workflows, integration keys, and outbound webhooks."
        eyebrow="Data transfer"
        icon={ArrowLeftRightIcon}
        title="Copy organization setup"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Export current org</CardTitle>
            <CardDescription>
              Creates a JSON bundle from the active Clerk organization in this
              Convex environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Widget customization draft and published settings</li>
              <li>Knowledge base indexed text for files and websites</li>
              <li>Saved replies, workflows, API keys, and outbound webhooks</li>
            </ul>

            {lastExportSummary ? (
              <div className="console-inset p-3 text-sm">
                <p className="console-label">Last export</p>
                <p className="mt-1 text-muted-foreground">
                  {formatSummaryLines(lastExportSummary).join(" · ") ||
                    "No organization data found"}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button disabled={isExporting} onClick={onExport}>
                {isExporting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <ClipboardCopyIcon className="size-4" />
                )}
                {isExporting ? "Exporting..." : "Copy bundle"}
              </Button>
              <Button
                disabled={!lastExportJson}
                onClick={onDownload}
                variant="outline"
              >
                <DownloadIcon className="size-4" />
                Download JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import into this org</CardTitle>
            <CardDescription>
              Paste a bundle exported from another environment or organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Does not move conversations, customer memory, or channel bots</li>
              <li>Re-upload widget images if logos or backgrounds break</li>
              <li>Telegram, Instagram, and WhatsApp need reconnecting on prod</li>
            </ul>

            <div className="flex flex-wrap gap-2">
              <Button onClick={onOpenImportDialog} variant="outline">
                <ClipboardPasteIcon className="size-4" />
                Import bundle
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                type="button"
                variant="outline"
              >
                <UploadIcon className="size-4" />
                Upload JSON
              </Button>
              <input
                accept="application/json,.json"
                className="hidden"
                onChange={onPickBundleFile}
                ref={fileInputRef}
                type="file"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Need only widget styling? Use the quick copy tools on{" "}
              <Link className="underline" href="/customization">
                Widget customization
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog onOpenChange={setIsImportDialogOpen} open={isImportDialogOpen}>
        <DialogContent className="!flex max-h-[90vh] max-w-3xl flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import organization bundle</DialogTitle>
            <DialogDescription>
              Paste a bundle or upload the downloaded JSON file. This writes
              into the currently selected Clerk organization on the connected
              Convex deployment.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--console-hairline-soft)] p-3">
              <div>
                <Label htmlFor="publish-widget-settings">
                  Publish widget settings after import
                </Label>
                <p className="text-xs text-muted-foreground">
                  Saves the imported widget draft and publishes it immediately.
                </p>
              </div>
              <Switch
                checked={publishWidgetSettings}
                id="publish-widget-settings"
                onCheckedChange={setPublishWidgetSettings}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--console-hairline-soft)] p-3">
              <div>
                <Label htmlFor="replace-knowledge-base">
                  Replace existing knowledge base
                </Label>
                <p className="text-xs text-muted-foreground">
                  Remove current knowledge sources before importing the bundle.
                </p>
              </div>
              <Switch
                checked={replaceKnowledgeBase}
                id="replace-knowledge-base"
                onCheckedChange={setReplaceKnowledgeBase}
              />
            </div>

            <Textarea
              className="h-[min(42vh,360px)] field-sizing-fixed resize-none overflow-y-auto font-mono text-xs"
              onChange={(event) => setImportPayload(event.target.value)}
              placeholder='Paste exported JSON here, e.g. {"type":"osonflow-org-bundle",...}'
              value={importPayload}
            />
          </div>

          <DialogFooter>
            <Button
              disabled={isImporting}
              onClick={() => setIsImportDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isImporting || !importPayload.trim()}
              onClick={onImport}
              type="button"
            >
              {isImporting ? "Importing..." : "Import bundle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConsolePage>
  )
}
