export type ProcessedVehicleImage = {
  mainFile: File;
  thumbnailFile: File;
  width: number;
  height: number;
};

const MAIN_MAX_DIMENSION = 2400;
const THUMB_MAX_DIMENSION = 500;
const MAIN_QUALITY = 0.9;
const THUMB_QUALITY = 0.78;

function getOutputDimensions(
  width: number,
  height: number,
  maxDimension: number
) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / Math.max(width, height);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decodeImage(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (!file.type.startsWith("image/")) {
    throw new Error("فقط فایل‌های تصویری قابل پردازش هستند.");
  }

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(
        file,
        {
          imageOrientation: "from-image",
        } as ImageBitmapOptions
      );

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      try {
        const bitmap = await createImageBitmap(file);

        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => bitmap.close(),
        };
      } catch {
        // Fall through to HTMLImageElement.
      }
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const element = new Image();

        element.onload = () => resolve(element);
        element.onerror = () =>
          reject(
            new Error(
              "خواندن تصویر امکان‌پذیر نیست. ممکن است فرمت تصویر توسط مرورگر پشتیبانی نشود."
            )
          );

        element.src = objectUrl;
      }
    );

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function canvasToWebP(
  canvas: HTMLCanvasElement,
  quality: number,
  fileName: string
): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });

  if (!blob) {
    throw new Error("تبدیل تصویر به WebP ناموفق بود.");
  }

  return new File([blob], fileName, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

async function renderWebP(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number,
  quality: number,
  fileName: string
) {
  const { width, height } = getOutputDimensions(
    sourceWidth,
    sourceHeight,
    maxDimension
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("مرورگر امکان پردازش تصویر را فراهم نکرد.");
  }

  context.drawImage(source, 0, 0, width, height);

  return {
    file: await canvasToWebP(canvas, quality, fileName),
    width,
    height,
  };
}

export async function processVehicleImage(
  file: File
): Promise<ProcessedVehicleImage> {
  const decoded = await decodeImage(file);

  try {
    const main = await renderWebP(
      decoded.source,
      decoded.width,
      decoded.height,
      MAIN_MAX_DIMENSION,
      MAIN_QUALITY,
      "vehicle.webp"
    );

    const thumbnail = await renderWebP(
      decoded.source,
      decoded.width,
      decoded.height,
      THUMB_MAX_DIMENSION,
      THUMB_QUALITY,
      "vehicle-thumb.webp"
    );

    return {
      mainFile: main.file,
      thumbnailFile: thumbnail.file,
      width: main.width,
      height: main.height,
    };
  } finally {
    decoded.cleanup();
  }
}
