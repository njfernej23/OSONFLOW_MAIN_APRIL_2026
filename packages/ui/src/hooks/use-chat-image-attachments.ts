"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  ChatAttachmentError,
  type PreparedChatImage,
  prepareImageForUpload,
  uploadPreparedImage,
} from "@workspace/ui/lib/chat-attachments"

export type ChatAttachmentDraft = {
  /** Stable key for React, independent of the server-side attachment id. */
  key: string
  status: "uploading" | "ready" | "error"
  previewUrl: string
  filename: string
  size: number
  width?: number
  height?: number
  attachmentId?: string
  error?: string
}

type RequestUploadUrl = () => Promise<{
  uploadUrl: string
  maxSizeBytes?: number
  maxPerMessage?: number
}>

type AttachUpload = (args: {
  storageId: string
  filename: string
  width?: number
  height?: number
}) => Promise<{ id: string }>

export type UseChatImageAttachmentsOptions = {
  /** False hides the control entirely — the moderator switched uploads off. */
  enabled: boolean
  maxPerMessage: number
  maxSizeBytes: number
  requestUploadUrl: RequestUploadUrl
  attachUpload: AttachUpload
  /** Releases an upload the sender removed before sending. */
  discardUpload?: (attachmentId: string) => Promise<void>
  onError?: (message: string) => void
}

/** Pulls the human-readable half out of a ConvexError without leaking internals. */
const messageFromError = (error: unknown, fallback: string) => {
  if (error instanceof ChatAttachmentError) {
    return error.message
  }

  const data = (error as { data?: unknown })?.data

  if (typeof data === "string") {
    return data
  }

  if (
    data &&
    typeof data === "object" &&
    typeof (data as { message?: unknown }).message === "string"
  ) {
    return (data as { message: string }).message
  }

  return fallback
}

/**
 * Owns the composer's pending image uploads for both the widget and the inbox.
 *
 * An upload is a two-step handshake — the server hands out a one-shot URL, the
 * browser POSTs the bytes, then the server validates and records the blob — and
 * this keeps the optimistic preview in step with it, so an image appears in the
 * tray immediately but cannot be sent until the server has accepted it.
 */
export const useChatImageAttachments = ({
  enabled,
  maxPerMessage,
  maxSizeBytes,
  requestUploadUrl,
  attachUpload,
  discardUpload,
  onError,
}: UseChatImageAttachmentsOptions) => {
  const [drafts, setDrafts] = useState<ChatAttachmentDraft[]>([])
  const previewUrlsRef = useRef(new Set<string>())

  const trackPreview = useCallback((url: string) => {
    previewUrlsRef.current.add(url)
  }, [])

  const releasePreview = useCallback((url: string) => {
    if (previewUrlsRef.current.delete(url)) {
      URL.revokeObjectURL(url)
    }
  }, [])

  useEffect(() => {
    const urls = previewUrlsRef.current

    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url)
      }

      urls.clear()
    }
  }, [])

  const reportError = useCallback(
    (message: string) => {
      onError?.(message)
    },
    [onError]
  )

  const uploadOne = useCallback(
    async (key: string, prepared: PreparedChatImage) => {
      try {
        const { uploadUrl } = await requestUploadUrl()
        const storageId = await uploadPreparedImage(uploadUrl, prepared)
        const attachment = await attachUpload({
          storageId,
          filename: prepared.filename,
          width: prepared.width,
          height: prepared.height,
        })

        setDrafts((current) =>
          current.map((draft) =>
            draft.key === key
              ? { ...draft, status: "ready", attachmentId: attachment.id }
              : draft
          )
        )
      } catch (error) {
        const message = messageFromError(
          error,
          "That image could not be uploaded."
        )

        setDrafts((current) =>
          current.map((draft) =>
            draft.key === key
              ? { ...draft, status: "error", error: message }
              : draft
          )
        )
        reportError(message)
      }
    },
    [attachUpload, reportError, requestUploadUrl]
  )

  const addFiles = useCallback(
    async (files: File[]) => {
      if (!enabled || files.length === 0) {
        return
      }

      // Read the live count rather than closing over it, so two quick drops
      // cannot together exceed the per-message limit.
      let accepted: File[] = []

      setDrafts((current) => {
        const remaining = Math.max(0, maxPerMessage - current.length)
        accepted = files.slice(0, remaining)

        if (files.length > remaining) {
          reportError(
            `You can attach up to ${maxPerMessage} image${maxPerMessage === 1 ? "" : "s"} per message.`
          )
        }

        return current
      })

      await Promise.all(
        accepted.map(async (file) => {
          const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`

          let prepared: PreparedChatImage

          try {
            prepared = await prepareImageForUpload(file, { maxSizeBytes })
          } catch (error) {
            reportError(
              messageFromError(error, "That image could not be prepared.")
            )
            return
          }

          trackPreview(prepared.previewUrl)

          setDrafts((current) => [
            ...current,
            {
              key,
              status: "uploading",
              previewUrl: prepared.previewUrl,
              filename: prepared.filename,
              size: prepared.blob.size,
              width: prepared.width,
              height: prepared.height,
            },
          ])

          await uploadOne(key, prepared)
        })
      )
    },
    [
      enabled,
      maxPerMessage,
      maxSizeBytes,
      reportError,
      trackPreview,
      uploadOne,
    ]
  )

  const removeDraft = useCallback(
    (key: string) => {
      setDrafts((current) => {
        const draft = current.find((item) => item.key === key)

        if (draft) {
          releasePreview(draft.previewUrl)

          if (draft.attachmentId && discardUpload) {
            void discardUpload(draft.attachmentId).catch(() => {
              // A stranded upload is swept server-side; nothing to show here.
            })
          }
        }

        return current.filter((item) => item.key !== key)
      })
    },
    [discardUpload, releasePreview]
  )

  /** Empties the tray and drops the local previews with it. */
  const clear = useCallback(() => {
    setDrafts((current) => {
      for (const draft of current) {
        releasePreview(draft.previewUrl)
      }

      return []
    })
  }, [releasePreview])

  /**
   * Empties the tray after a send but keeps the previews alive, so an
   * optimistic bubble can show the images from local memory until the server
   * echoes the message back. The caller releases them with `releasePreviews`.
   */
  const clearAfterSend = useCallback(() => {
    setDrafts([])
  }, [])

  const releasePreviews = useCallback(
    (urls: string[]) => {
      for (const url of urls) {
        releasePreview(url)
      }
    },
    [releasePreview]
  )

  /** Puts a cleared tray back when the send it was cleared for failed. */
  const restoreDrafts = useCallback((restored: ChatAttachmentDraft[]) => {
    setDrafts((current) => {
      const existing = new Set(current.map((draft) => draft.key))

      return [
        ...current,
        ...restored.filter((draft) => !existing.has(draft.key)),
      ]
    })
  }, [])

  const readyAttachmentIds = useMemo(
    () =>
      drafts
        .filter((draft) => draft.status === "ready" && draft.attachmentId)
        .map((draft) => draft.attachmentId as string),
    [drafts]
  )

  const isUploading = drafts.some((draft) => draft.status === "uploading")

  return {
    drafts,
    addFiles,
    removeDraft,
    clear,
    clearAfterSend,
    releasePreviews,
    restoreDrafts,
    readyAttachmentIds,
    isUploading,
    canAttachMore: enabled && drafts.length < maxPerMessage,
  }
}
