import type { Id } from "@workspace/backend/_generated/dataModel"

export const IMAGE_UPLOAD_ACCEPT = "image/*"

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_IMAGE_SIZE_LABEL = "5MB"

type GenerateImageUploadUrl = (args: Record<string, never>) => Promise<string>
type GetUploadedImageUrl = (args: {
  storageId: Id<"_storage">
}) => Promise<{ url: string }>

const validateImageFile = (file: File) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.")
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Image must be ${MAX_IMAGE_SIZE_LABEL} or smaller.`)
  }
}

export const uploadImageFile = async (
  file: File,
  generateImageUploadUrl: GenerateImageUploadUrl,
  getUploadedImageUrl: GetUploadedImageUrl
): Promise<string> => {
  validateImageFile(file)

  const uploadUrl = await generateImageUploadUrl({})
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  })

  if (!uploadResponse.ok) {
    throw new Error("Could not upload the selected image.")
  }

  const { storageId } = (await uploadResponse.json()) as {
    storageId: Id<"_storage">
  }
  const { url } = await getUploadedImageUrl({ storageId })

  return url
}
