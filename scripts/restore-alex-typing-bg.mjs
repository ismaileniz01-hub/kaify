/**
 * alex-typing.png'deki şeffaf alanları beyaz yap (arka planı geri getir)
 */
import sharp from "sharp";
import { renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const inputPath = join(root, "public", "avatars", "alex-typing.png");
const outputPath = join(root, "public", "avatars", "alex-typing.png");

const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;

// Şeffaf pikselleri beyaz yap
for (let i = 0; i < data.length; i += channels) {
  const alpha = data[i + 3];
  if (alpha < 128) {
    // Şeffaf veya yarı-şeffaf -> beyaz yap
    data[i] = 255;     // R
    data[i + 1] = 255; // G
    data[i + 2] = 255; // B
    data[i + 3] = 255; // A (tam opak)
  }
}

const temp = outputPath + ".tmp.png";
await sharp(data, { raw: { width, height, channels } })
  .png()
  .toFile(temp);

renameSync(temp, outputPath);
console.log("Restored white background for:", outputPath);
