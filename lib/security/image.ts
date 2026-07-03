import sharp from "sharp";
import { ApiError } from "@/lib/api/errors";

export type ValidatedImage = {
  buffer: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
};

const MAX_DIMENSION = 4096;
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;

/**
 * Long-edge cap for images sent to the vision model. Gemini bills by image
 * resolution (tiling), so ~1280px keeps body/food detail while cutting input
 * tokens dramatically versus a full-res phone photo. Tunable via env.
 */
const VISION_MAX_DIMENSION = (() => {
  const raw = Number.parseInt(process.env.AI_VISION_MAX_DIMENSION ?? "", 10);
  return Number.isFinite(raw) && raw >= 512 ? raw : 1280;
})();

/**
 * Prepares an uploaded photo for the vision model: validates the bytes via
 * sharp (magic-byte re-encode, strips metadata), downscales to the vision cap,
 * and returns a compact JPEG. The analyze flow does NOT store the raw image, so
 * this only affects the AI-bound copy — no user-visible quality is lost.
 */
export async function prepareVisionImage(
  base64: string,
): Promise<{ base64: string; mimeType: "image/jpeg" }> {
  const input = Buffer.from(base64, "base64");
  if (input.byteLength === 0) {
    throw new ApiError("VALIDATION_ERROR", "Boş görsel.");
  }
  if (input.byteLength > MAX_OUTPUT_BYTES) {
    throw new ApiError("VALIDATION_ERROR", "Görsel 5MB'dan büyük olamaz.");
  }

  const pipeline = sharp(input, { failOn: "error" }).rotate();
  const meta = await pipeline.metadata();
  if (!meta.width || !meta.height || meta.width < 1 || meta.height < 1) {
    throw new ApiError("VALIDATION_ERROR", "Geçersiz görsel dosyası.");
  }

  const buffer = await pipeline
    .resize({
      width: VISION_MAX_DIMENSION,
      height: VISION_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  return { base64: buffer.toString("base64"), mimeType: "image/jpeg" };
}

/**
 * Validates image bytes via sharp (magic-byte check + re-encode).
 * Strips metadata and rejects polyglot / non-image payloads.
 */
export async function validateAndProcessImage(
  input: Buffer,
  declaredMime: "image/jpeg" | "image/png" | "image/webp",
): Promise<ValidatedImage> {
  if (input.byteLength === 0) {
    throw new ApiError("VALIDATION_ERROR", "Boş görsel.");
  }
  if (input.byteLength > MAX_OUTPUT_BYTES) {
    throw new ApiError("VALIDATION_ERROR", "Görsel 5MB'dan büyük olamaz.");
  }

  const pipeline = sharp(input, { failOn: "error" }).rotate();
  const meta = await pipeline.metadata();

  if (!meta.width || !meta.height || meta.width < 1 || meta.height < 1) {
    throw new ApiError("VALIDATION_ERROR", "Geçersiz görsel dosyası.");
  }
  if (meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION) {
    throw new ApiError("VALIDATION_ERROR", "Görsel boyutu çok büyük.");
  }

  let mimeType: ValidatedImage["mimeType"];
  let ext: ValidatedImage["ext"];
  let buffer: Buffer;

  if (declaredMime === "image/png") {
    buffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    mimeType = "image/png";
    ext = "png";
  } else if (declaredMime === "image/webp") {
    buffer = await pipeline.webp({ quality: 85 }).toBuffer();
    mimeType = "image/webp";
    ext = "webp";
  } else {
    buffer = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    mimeType = "image/jpeg";
    ext = "jpg";
  }

  if (buffer.byteLength > MAX_OUTPUT_BYTES) {
    throw new ApiError("VALIDATION_ERROR", "Görsel işlendikten sonra çok büyük.");
  }

  return { buffer, mimeType, ext };
}
