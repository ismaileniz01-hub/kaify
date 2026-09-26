/**
 * Client-side photo normalize for Maya/Leo analyze uploads.
 *
 * Phone camera files are often HEIC (iOS) or 3–8MB JPEGs. The analyze API
 * is a JSON body on Vercel (~4MB cap), so the raw FileReader base64 of a
 * 3MB photo never reaches Gemini and the UI shows "photo analysis failed".
 * Decode in the browser (Safari/WKWebView can read HEIC), resize, emit JPEG.
 */

export const CHAT_PHOTO_MAX_EDGE = 1280;
export const CHAT_PHOTO_MAX_SOURCE_BYTES = 25 * 1024 * 1024;
export const CHAT_PHOTO_MAX_JPEG_BYTES = 2_400_000;
export const CHAT_PHOTO_ACCEPT = "image/*,image/heic,image/heif,.heic,.heif";

export type ChatPhotoErrorCode = "unsupported" | "too_large" | "decode_failed";

export class ChatPhotoError extends Error {
  readonly code: ChatPhotoErrorCode;

  constructor(code: ChatPhotoErrorCode, message: string) {
    super(message);
    this.name = "ChatPhotoError";
    this.code = code;
  }
}

export type PreparedChatPhoto = {
  base64: string;
  mimeType: "image/jpeg";
};

const HEIC_MIME = /image\/hei[cf]/i;
const HEIC_NAME = /\.hei[cf]$/i;
const KNOWN_PHOTO_MIME = /image\/(jpeg|jpg|pjpeg|png|webp|hei[cf])/i;

export function fitPhotoDimensions(
  width: number,
  height: number,
  maxEdge = CHAT_PHOTO_MAX_EDGE,
): { width: number; height: number } {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const edge = Math.max(w, h);
  if (edge <= maxEdge) return { width: w, height: h };
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

export function isHeicPhoto(file: File): boolean {
  return HEIC_MIME.test(file.type) || HEIC_NAME.test(file.name);
}

/** Composer may attach HEIC / empty-type WebView files; upload converts them. */
export function canAttachChatPhoto(file: File): boolean {
  if (file.size <= 0) return false;
  if (file.size > CHAT_PHOTO_MAX_SOURCE_BYTES) return false;
  const mime = (file.type || "").trim().toLowerCase();
  if (!mime) return true;
  if (mime === "image/*" || mime.startsWith("image/")) return true;
  return KNOWN_PHOTO_MIME.test(mime) || isHeicPhoto(file);
}

export async function prepareChatPhoto(file: File): Promise<PreparedChatPhoto> {
  if (file.size <= 0) {
    throw new ChatPhotoError("unsupported", "Empty image file.");
  }
  if (file.size > CHAT_PHOTO_MAX_SOURCE_BYTES) {
    throw new ChatPhotoError("too_large", "Photo is too large.");
  }
  if (!canAttachChatPhoto(file)) {
    throw new ChatPhotoError("unsupported", "Unsupported image format.");
  }

  const decoded = await decodePhotoSource(file);
  try {
    if (decoded.width < 1 || decoded.height < 1) {
      throw new ChatPhotoError("decode_failed", "Could not decode the photo.");
    }
    const size = fitPhotoDimensions(decoded.width, decoded.height);
    const canvas = createDrawCanvas(size.width, size.height);
    const ctx = canvas.getContext("2d");
    if (!ctx || !("drawImage" in ctx)) {
      throw new ChatPhotoError("decode_failed", "Could not draw the photo.");
    }
    ctx.drawImage(decoded.source, 0, 0, size.width, size.height);
    const blob = await canvasToJpeg(canvas);
    if (blob.size > CHAT_PHOTO_MAX_JPEG_BYTES) {
      throw new ChatPhotoError("too_large", "Photo is too large.");
    }
    return { base64: await blobToBase64(blob), mimeType: "image/jpeg" };
  } finally {
    decoded.close?.();
  }
}

type DecodedPhoto = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

async function decodePhotoSource(file: File): Promise<DecodedPhoto> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      try {
        const bitmap = await createImageBitmap(file);
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          close: () => bitmap.close(),
        };
      } catch {
        // Fall through to HTMLImageElement (HEIC on some WebViews).
      }
    }
  }
  return imageElementSource(file);
}

async function imageElementSource(file: File): Promise<DecodedPhoto> {
  if (typeof Image === "undefined") {
    throw new ChatPhotoError("decode_failed", "Could not decode the photo.");
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadHtmlImage(url);
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    if (error instanceof ChatPhotoError) throw error;
    throw new ChatPhotoError("decode_failed", "Could not decode the photo.");
  }
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new ChatPhotoError("decode_failed", "Could not decode the photo."));
    img.src = url;
  });
}

function createDrawCanvas(
  width: number,
  height: number,
): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document === "undefined") {
    throw new ChatPhotoError("decode_failed", "Could not draw the photo.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function canvasToJpeg(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  quality = 0.82,
): Promise<Blob> {
  if ("convertToBlob" in canvas && typeof canvas.convertToBlob === "function") {
    return canvas.convertToBlob({ type: "image/jpeg", quality });
  }
  const htmlCanvas = canvas as HTMLCanvasElement;
  return new Promise((resolve, reject) => {
    htmlCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new ChatPhotoError("decode_failed", "Could not encode JPEG."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
