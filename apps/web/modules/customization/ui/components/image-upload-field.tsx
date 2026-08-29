"use client"

import { useRef, useState, type DragEvent } from "react"
import { useMutation } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { Loader2Icon, UploadIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { IMAGE_UPLOAD_ACCEPT, uploadImageFile } from "./image-upload-utils"

/**
 * One upload control for every image the widget can carry.
 *
 * The three previous copies of this — logo, home background and launcher icon —
 * each had their own markup and preview size, which is what made the brand
 * section read as a form rather than a brand kit.
 */
export const ImageUploadField = ({
  value,
  onChange,
  label,
  description,
  /** `avatar` previews a circular mark, `wide` previews a 16:9 plate. */
  shape = "avatar",
  emptyHint = "PNG, JPG or WebP · up to 5MB",
  disabled,
}: {
  value: string
  onChange: (url: string) => void
  label: string
  description?: string
  shape?: "avatar" | "square" | "wide"
  emptyHint?: string
  disabled?: boolean
}) => {
  const generateImageUploadUrl = useMutation(
    api.private.widgetSettings.generateImageUploadUrl
  )
  const getUploadedImageUrl = useMutation(
    api.private.widgetSettings.getUploadedImageUrl
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const trimmedValue = value?.trim() ?? ""
  const hasImage = trimmedValue.length > 0

  const upload = async (file: File | undefined) => {
    if (!file) return

    setIsUploading(true)
    try {
      const imageUrl = await uploadImageFile(
        file,
        generateImageUploadUrl,
        getUploadedImageUrl
      )
      onChange(imageUrl)
      toast.success(`${label} uploaded`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload this image"
      )
    } finally {
      setIsUploading(false)
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (disabled || isUploading) return
    void upload(event.dataTransfer.files?.[0])
  }

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-foreground">{label}</span>
        {hasImage ? (
          <button
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            disabled={disabled || isUploading}
            onClick={() => onChange("")}
            type="button"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          "console-inset mt-2 flex items-center gap-3 px-3 py-3 transition-colors",
          isDragging && "border-primary/45 bg-primary/[0.06]",
          (disabled || isUploading) && "opacity-60"
        )}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled && !isUploading) setIsDragging(true)
        }}
        onDrop={onDrop}
      >
        <input
          accept={IMAGE_UPLOAD_ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            void upload(file)
          }}
          ref={inputRef}
          type="file"
        />

        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden border border-[var(--console-hairline-soft)] bg-background",
            shape === "avatar" && "size-11 rounded-full",
            shape === "square" && "size-11 rounded-[9px]",
            shape === "wide" && "h-11 w-20 rounded-[9px]"
          )}
        >
          {isUploading ? (
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          ) : hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`${label} preview`}
              className="size-full object-cover"
              src={trimmedValue}
            />
          ) : (
            <UploadIcon className="size-4 text-muted-foreground/70" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">
            {hasImage ? "Image set" : emptyHint}
          </p>
          {description ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
              {description}
            </p>
          ) : null}
        </div>

        <Button
          className="h-8 shrink-0 gap-1.5 text-xs"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          size="sm"
          type="button"
          variant="outline"
        >
          {hasImage ? (
            "Replace"
          ) : (
            <>
              <UploadIcon className="size-3.5" />
              Upload
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/** Compact remove affordance re-used by callers that render their own preview. */
export const ClearImageButton = ({
  onClear,
  disabled,
}: {
  onClear: () => void
  disabled?: boolean
}) => (
  <Button
    className="h-8 gap-1.5 text-xs"
    disabled={disabled}
    onClick={onClear}
    size="sm"
    type="button"
    variant="ghost"
  >
    <XIcon className="size-3.5" />
    Remove
  </Button>
)
