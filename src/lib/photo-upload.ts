const PHOTO_SIZE = 500;
const JPEG_QUALITY = 0.86;
const ACCEPTED_PHOTO_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i;

export type PreparedPhotoUpload = {
  dataUrl: string;
  name: string;
  type: string;
  size: number;
};

function isLikelyPhotoFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    file.type === "" ||
    file.type === "application/octet-stream" ||
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    ACCEPTED_PHOTO_EXTENSIONS.test(file.name)
  );
}

function isHeicPhoto(file: File) {
  return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

function getJpegName(fileName: string) {
  const trimmedName = fileName.trim();

  if (!trimmedName) {
    return "photo.jpg";
  }

  return trimmedName.replace(/\.[^.]+$/, "") + ".jpg";
}

async function imageToCanvasSource(file: File) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall back to HTMLImageElement below. Safari can decode some iPhone
      // formats here even when createImageBitmap cannot.
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("写真を読み込めませんでした。"));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function canvasToJpegDataUrl(file: File) {
  const image = await imageToCanvasSource(file);
  const sourceSize = Math.min(image.width, image.height);
  const sourceX = Math.max(0, Math.floor((image.width - sourceSize) / 2));
  const sourceY = Math.max(0, Math.floor((image.height - sourceSize) / 2));
  const canvas = document.createElement("canvas");

  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("写真を変換できませんでした。");
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    PHOTO_SIZE,
    PHOTO_SIZE,
  );

  if ("close" in image && typeof image.close === "function") {
    image.close();
  }

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export async function preparePhotoUpload(file: File): Promise<PreparedPhotoUpload> {
  if (!isLikelyPhotoFile(file)) {
    throw new Error("画像ファイルを選択してください。");
  }

  try {
    const dataUrl = await canvasToJpegDataUrl(file);

    return {
      dataUrl,
      name: getJpegName(file.name),
      type: "image/jpeg",
      size: Math.round((dataUrl.length * 3) / 4),
    };
  } catch {
    if (isHeicPhoto(file)) {
      throw new Error(
        "iPhoneの写真を変換できませんでした。カメラ設定で互換性優先にするか、JPEG/PNGで選択してください。",
      );
    }

    throw new Error("写真を500x500のJPEGに変換できませんでした。");
  }
}

export const photoInputAccept =
  "image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,image/heic,image/heif";
