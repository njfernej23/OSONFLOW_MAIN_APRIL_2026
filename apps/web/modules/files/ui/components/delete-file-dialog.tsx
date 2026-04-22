"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { api } from "@workspace/backend/_generated/api"
import type { PublicFile } from "@workspace/backend/private/files"
import { toast } from "sonner"
import {
  AlertTriangleIcon,
  FileIcon,
  GlobeIcon,
  Loader2Icon,
} from "lucide-react"

interface DeleteFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: PublicFile | null
  onDeleted?: () => void
}

export const DeleteFileDialog = ({
  open,
  onOpenChange,
  file,
  onDeleted,
}: DeleteFileDialogProps) => {
  const deleteFile = useMutation(api.private.files.deleteFile)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!file) return

    setIsDeleting(true)
    try {
      await deleteFile({ entryId: file.id })
      toast.success(`"${file.name}" has been removed from your knowledge base.`)
      onDeleted?.()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast.error("Failed to delete. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const Icon = file?.type === "url" ? GlobeIcon : FileIcon

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {/* warning icon */}
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangleIcon className="size-5 text-destructive" />
          </div>
          <DialogTitle>Delete knowledge source?</DialogTitle>
          <DialogDescription>
            This will permanently remove the source from your knowledge base and
            it will no longer be used by your AI assistant. This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>

        {file && (
          <div className="flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background">
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {file.type.toUpperCase()}
                {file.size !== "unknown" ? ` · ${file.size}` : ""}
                {file.category ? ` · ${file.category}` : ""}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Keep it
          </Button>
          <Button
            disabled={isDeleting || !file}
            onClick={handleDelete}
            variant="destructive"
          >
            {isDeleting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete source"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
