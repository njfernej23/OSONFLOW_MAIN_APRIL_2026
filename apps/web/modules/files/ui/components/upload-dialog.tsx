"use client"

import { useAction } from "convex/react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@workspace/ui/components/dropzone"
import { api } from "@workspace/backend/_generated/api"
import { toast } from "sonner"
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FileIcon,
  GlobeIcon,
  Loader2Icon,
  TagIcon,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileUploaded?: () => void
}

type UploadState = "idle" | "uploading" | "success" | "error"

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "text/csv": [".csv"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
} as const

const ACCEPTED_LABELS = ["PDF", "CSV", "TXT", "DOCX"]

export const UploadDialog = ({
  open,
  onOpenChange,
  onFileUploaded,
}: UploadDialogProps) => {
  const addFile = useAction(api.private.files.addFile)
  const addWebsite = useAction(
    (api as any).private.files.addWebsite
  ) as (args: {
    url: string
    title?: string
    category?: string
  }) => Promise<{ entryId: string; created: boolean; sourceUrl: string }>

  const [uploadMode, setUploadMode] = useState<"file" | "website">("file")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadForm, setUploadForm] = useState({
    category: "",
    filename: "",
    websiteUrl: "",
    websiteTitle: "",
  })

  const isUploading = uploadState === "uploading"

  const handleFileDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setUploadedFiles([file])
      if (!uploadForm.filename) {
        setUploadForm((prev) => ({ ...prev, filename: file.name }))
      }
      setUploadState("idle")
      setErrorMessage(null)
    }
  }

  const handleUpload = async () => {
    setUploadState("uploading")
    setErrorMessage(null)

    try {
      if (uploadMode === "website") {
        const websiteUrl = uploadForm.websiteUrl.trim()
        if (!websiteUrl) return

        await addWebsite({
          url: websiteUrl,
          title: uploadForm.websiteTitle.trim() || undefined,
          category: uploadForm.category.trim() || undefined,
        })

        toast.success("Website scraped and added to knowledge base.")
        setUploadState("success")
        onFileUploaded?.()
        setTimeout(handleCancel, 800)
        return
      }

      const blob = uploadedFiles[0]
      if (!blob) return

      await addFile({
        bytes: await blob.arrayBuffer(),
        filename: uploadForm.filename || blob.name,
        mimeType: blob.type || "text/plain",
        category: uploadForm.category.trim() || undefined,
      })

      toast.success("File uploaded and indexed successfully.")
      setUploadState("success")
      onFileUploaded?.()
      setTimeout(handleCancel, 800)
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      setErrorMessage(msg)
      setUploadState("error")
      toast.error(msg)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    // reset after animation settles
    setTimeout(() => {
      setUploadMode("file")
      setUploadedFiles([])
      setUploadState("idle")
      setErrorMessage(null)
      setUploadForm({
        category: "",
        filename: "",
        websiteUrl: "",
        websiteTitle: "",
      })
    }, 200)
  }

  const canSubmit =
    !isUploading &&
    uploadForm.category.trim() !== "" &&
    (uploadMode === "file"
      ? uploadedFiles.length > 0
      : uploadForm.websiteUrl.trim() !== "")

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {uploadMode === "file" ? (
              <FileIcon className="size-4 text-muted-foreground" />
            ) : (
              <GlobeIcon className="size-4 text-muted-foreground" />
            )}
            Add Knowledge Source
          </DialogTitle>
          <DialogDescription>
            Upload a document or provide a URL — your AI assistant will index it
            automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* category */}
          <div className="space-y-1.5">
            <Label
              className="flex items-center gap-1.5 text-sm"
              htmlFor="category"
            >
              <TagIcon className="size-3.5 text-muted-foreground" />
              Category
            </Label>
            <Input
              id="category"
              onChange={(e) =>
                setUploadForm((prev) => ({ ...prev, category: e.target.value }))
              }
              placeholder="e.g. Documentation, Support, Product"
              value={uploadForm.category}
            />
          </div>

          {/* tabs */}
          <Tabs
            onValueChange={(v) => {
              setUploadMode(v as "file" | "website")
              setUploadState("idle")
              setErrorMessage(null)
            }}
            value={uploadMode}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">
                <FileIcon className="size-3.5" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="website">
                <GlobeIcon className="size-3.5" />
                Website URL
              </TabsTrigger>
            </TabsList>

            {/* file tab */}
            <TabsContent className="mt-4 space-y-4" value="file">
              <div className="space-y-1.5">
                <Label className="text-sm" htmlFor="filename">
                  Filename{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="filename"
                  onChange={(e) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      filename: e.target.value,
                    }))
                  }
                  placeholder="Override default filename"
                  value={uploadForm.filename}
                />
              </div>

              <Dropzone
                accept={ACCEPTED_TYPES}
                disabled={isUploading}
                maxFiles={1}
                onDrop={handleFileDrop}
                src={uploadedFiles}
              >
                <DropzoneEmptyState />
                <DropzoneContent />
              </Dropzone>

              <p className="text-center text-xs text-muted-foreground">
                Accepted formats:{" "}
                {ACCEPTED_LABELS.map((l, i) => (
                  <span key={l}>
                    <span className="font-medium text-foreground">{l}</span>
                    {i < ACCEPTED_LABELS.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
            </TabsContent>

            {/* website tab */}
            <TabsContent className="mt-4 space-y-4" value="website">
              <div className="space-y-1.5">
                <Label className="text-sm" htmlFor="website-url">
                  Page URL
                </Label>
                <div className="relative">
                  <GlobeIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    id="website-url"
                    onChange={(e) =>
                      setUploadForm((prev) => ({
                        ...prev,
                        websiteUrl: e.target.value,
                      }))
                    }
                    placeholder="https://example.com/docs/article"
                    type="url"
                    value={uploadForm.websiteUrl}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Public page URL — we fetch and index its readable content
                  automatically.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm" htmlFor="website-title">
                  Title{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="website-title"
                  onChange={(e) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      websiteTitle: e.target.value,
                    }))
                  }
                  placeholder="Custom source title"
                  value={uploadForm.websiteTitle}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* error message */}
          {uploadState === "error" && errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
              <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
              {errorMessage}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2 gap-2 sm:gap-0">
          <Button
            disabled={isUploading}
            onClick={handleCancel}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className={cn(
              "min-w-28 transition-all",
              uploadState === "success" && "bg-emerald-600 hover:bg-emerald-600"
            )}
            disabled={!canSubmit}
            onClick={handleUpload}
          >
            {uploadState === "uploading" ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                {uploadMode === "website" ? "Scraping…" : "Uploading…"}
              </>
            ) : uploadState === "success" ? (
              <>
                <CheckCircle2Icon className="size-4" />
                Done
              </>
            ) : uploadMode === "website" ? (
              "Scrape & Save"
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
