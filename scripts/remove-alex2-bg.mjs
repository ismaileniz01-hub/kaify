/**
 * alex 2.png - yeşilin TÜM tonlarını sil
 */
import sharp from "sharp";
import { renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function processFile(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const buffer = Buffer.from(data);

  for (let i = 0; i < buffer.length; i += channels) {
    const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
    if (g > r * 1.05 && g > b * 1.05 && g > 40) {
      buffer[i + 3] = 0;
    }
  }

  for (let pass = 0; pass < 5; pass++) {
    const current = Buffer.from(buffer);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * channels;
        if (current[i + 3] === 0) continue;

        let hasTransparentNeighbor = false;
        for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1],[x+1,y+1],[x-1,y-1],[x+1,y-1],[x-1,y+1]]) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (current[(ny * width + nx) * channels + 3] === 0) {
            hasTransparentNeighbor = true;
            break;
          }
        }

        if (hasTransparentNeighbor) {
          const r = current[i], g = current[i+1], b = current[i+2];
          if (g > r * 1.02 && g > b * 1.02) {
            buffer[i + 3] = 0;
          }
        }
      }
    }
  }

  const temp = outputPath + ".tmp.png";
  await sharp(buffer, { raw: { width, height, channels } })
    .png()
    .toFile(temp);

  renameSync(temp, outputPath);
  console.log("OK:", outputPath);
}

const inputPath = join(root, "public", "avatars", "alex 2.png");
const outputPath = join(root, "public", "avatars", "alex 2.png");

await processFile(inputPath, outputPath);
