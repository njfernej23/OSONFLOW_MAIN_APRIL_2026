/**
 * Client-side preparation for chat image attachments.
 *
 * Every image is decoded and re-encoded in the browser before it is uploaded.
 * That is a performance measure — a 12MP phone photo leaves as a ~150KB WebP —
 * and a privacy one: re-encoding through a canvas drops EXIF entirely, so a
 * visitor's GPS coordinates and camera serial never reach the operator. It also
 * means the bytes that arrive at the server are ones the browser's own image
 * decoder produced, rather than a file that merely claims to be a picture.
 *
 * None of this replaces the server checks. The upload is validated again by
 * magic number after it lands.
 */

/**
 * What the file picker offers. Wider than what is stored: HEIC and AVIF are
 * accepted from the camera roll and converted below, so an iPhone photo works
 * without the visitor having to convert anything.
 */
export const ATTACHMENT_FILE_INPUT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif"

/** Longest edge kept after downscaling. Comfortably retina for a chat bubble. */
const MAX_IMAGE_DIMENSION = 1600
const WEBP_QUALITY = 0.82
const JPEG_QUALITY = 0.85

export class ChatAttachmentError extends Error {}

export type PreparedChatImage = {
  blob: Blob
  filename: string
  mediaType: string
  width: number
  height: number
  /** Object URL for the optimistic preview. Revoke it when the item is dropped. */
  previewUrl: string
}

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const replaceExtension = (filename: string, extension: string) => {
  const base = filename.replace(/\.[^.]+$/, "") || "image"

  return `${base}.${extension}`
}

const canEncode = (mediaType: string) => {
  if (typeof document === "undefined") {
    return false
  }

  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1

  return canvas.toDataURL(mediaType).startsWith(`data:${mediaType}`)
}

let webpSupport: boolean | null = null

const supportsWebp = () => {
  if (webpSupport === null) {
    webpSupport = canEncode("image/webp")
  }

  return webpSupport
}

const decode = async (file: File) => {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file)
    } catch {
      // Falls through to the <img> path, which handles formats the bitmap
      // decoder refuses in some browsers.
    }
  }

  const url = URL.createObjectURL(file)

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new ChatAttachmentError("decode failed"))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

const toBlob = (canvas: HTMLCanvasElement, mediaType: string, quality: number) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mediaType, quality)
  })

/**
 * Decodes, downscales and re-encodes one picked file.
 *
 * Animated GIFs are passed through untouched — a canvas would flatten them to
 * their first frame — and are held to the same size limit instead.
 */
export const prepareImageForUpload = async (
  file: File,
  { maxSizeBytes }: { maxSizeBytes: number }
): Promise<PreparedChatImage> => {
  if (!file.type.startsWith("image/")) {
    throw new ChatAttachmentError("Only images can be attached.")
  }

  if (file.type === "image/svg+xml") {
    throw new ChatAttachmentError("SVG files cannot be attached.")
  }

  // A hard ceiling on what is even decoded, so a huge file is rejected before
  // it is pulled into a canvas.
  if (file.size > Math.max(maxSizeBytes, 1) * 4) {
    throw new ChatAttachmentError(
      `That image is too large. The limit is ${formatFileSize(maxSizeBytes)}.`
    )
  }

  let source: ImageBitmap | HTMLImageElement

  try {
    source = await decode(file)
  } catch {
    throw new ChatAttachmentError("That image could not be read.")
  }

  const sourceWidth =
    "width" in source ? (source.width as number) : 0
  const sourceHeight =
    "height" in source ? (source.height as number) : 0

  if (!sourceWidth || !sourceHeight) {
    throw new ChatAttachmentError("That image could not be read.")
  }

  const passThrough = (): PreparedChatImage => {
    if (file.size > maxSizeBytes) {
      throw new ChatAttachmentError(
        `That image is too large. The limit is ${formatFileSize(maxSizeBytes)}.`
      )
    }

    return {
      blob: file,
      filename: file.name || "image.gif",
      mediaType: file.type,
      width: sourceWidth,
      height: sourceHeight,
      previewUrl: URL.createObjectURL(file),
    }
  }

  if (file.type === "image/gif") {
    return passThrough()
  }

  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / Math.max(sourceWidth, sourceHeight)
  )
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")

  if (!context) {
    return passThrough()
  }

  context.drawImage(source as CanvasImageSource, 0, 0, width, height)

  if ("close" in source && typeof source.close === "function") {
    source.close()
  }

  const useWebp = supportsWebp()
  const mediaType = useWebp ? "image/webp" : "image/jpeg"
  const blob = await toBlob(
    canvas,
    mediaType,
    useWebp ? WEBP_QUALITY : JPEG_QUALITY
  )

  if (!blob) {
    return passThrough()
  }

  if (blob.size > maxSizeBytes) {
    throw new ChatAttachmentError(
      `That image is too large. The limit is ${formatFileSize(maxSizeBytes)}.`
    )
  }

  return {
    blob,
    filename: replaceExtension(
      file.name || "image",
      useWebp ? "webp" : "jpg"
    ),
    mediaType,
    width,
    height,
    previewUrl: URL.createObjectURL(blob),
  }
}

/** POSTs the prepared bytes to a Convex upload URL and returns the storage id. */
export const uploadPreparedImage = async (
  uploadUrl: string,
  prepared: PreparedChatImage
): Promise<string> => {
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": prepared.mediaType },
    body: prepared.blob,
  })

  if (!response.ok) {
    throw new ChatAttachmentError("The upload did not complete. Try again.")
  }

  const { storageId } = (await response.json()) as { storageId?: string }

  if (!storageId) {
    throw new ChatAttachmentError("The upload did not complete. Try again.")
  }

  return storageId
}

/** Pulls image files out of a paste or a drop, ignoring anything else. */
export const imageFilesFromDataTransfer = (data: DataTransfer | null) => {
  if (!data) {
    return [] as File[]
  }

  return Array.from(data.files).filter(
    (file) => file.type.startsWith("image/") && file.type !== "image/svg+xml"
  )
}
