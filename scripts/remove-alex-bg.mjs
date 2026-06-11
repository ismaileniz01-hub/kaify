/**
 * Alex 1 (yeşil arka planlı) resmindeki yeşil arka planı temizler.
 * Yeşil rengi (chroma key) şeffaf yapar.
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

  // Yeşil arka planı temizle
  // Yeşil: G değeri yüksek, R ve B değerleri düşük
  for (let i = 0; i < buffer.length; i += channels) {
    const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
    
    // Yeşil pikselleri tespit et: G > R ve G > B ve G yeterince yüksek
    if (g > r * 1.3 && g > b * 1.3 && g > 80) {
      // Tam yeşil: tamamen şeffaf
      if (g > 150 && r < 100 && b < 100) {
        buffer[i + 3] = 0;
      } else {
        // Kenar yeşili: kısmi şeffaflık
        const greenness = Math.min(1, (g - Math.max(r, b)) / 255);
        buffer[i + 3] = Math.round((1 - greenness) * 255);
      }
    }
  }

  // Kenar yumuşatma
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (buffer[i + 3] === 0) continue;

      // Şeffaf alana komşu pikselleri yumuşat
      let touchesTransparent = false;
      for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (buffer[(ny * width + nx) * channels + 3] === 0) {
          touchesTransparent = true;
          break;
        }
      }
      
      if (touchesTransparent) {
        const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
        // Yeşilimsi kenarları yumuşat
        if (g > r * 1.1 && g > b * 1.1) {
          const greenness = Math.min(1, (g - Math.max(r, b)) / 255);
          buffer[i + 3] = Math.round((1 - greenness * 0.7) * 255);
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

// Alex 1 resmini işle
const inputPath = join(root, "public", "avatars", "alex-typing.png");
const outputPath = join(root, "public", "avatars", "alex-typing.png");

await processFile(inputPath, outputPath);
