export const IMAGE_UPLOAD_ACCEPT = "image/*";

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export const readImageAsDataUrl = (file: File): Promise<string> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Image must be 2MB or smaller.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read the selected image."));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(new Error("Could not read the selected image."));
    };
    reader.readAsDataURL(file);
  });
};
