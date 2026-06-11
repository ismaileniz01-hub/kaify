/**
 * dr maya 1.png'deki TÜM mavi pikselleri yok eder.
 * Mavi = B > R ve B > G olan her piksel
 * Karakter üzerinde mavi olmadığı için güvenle silebiliriz.
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

  let bgCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
      
      // Mavi ton baskın mı? (B, R ve G'den büyük)
      if (b > r && b > g) {
        buffer[i + 3] = 0;
        bgCount++;
      }
    }
  }

  console.log(`  Temizlenen mavi piksel: ${bgCount} / ${width * height}`);

  const temp = outputPath + ".tmp.png";
  await sharp(buffer, { raw: { width, height, channels } })
    .png()
    .toFile(temp);

  renameSync(temp, outputPath);
  console.log("OK:", outputPath);
}

const inputPath = join(root, "public", "avatars", "dr maya 1.png");
const outputPath = join(root, "public", "avatars", "dr maya 1.png");
console.log("\nİşleniyor: dr maya 1.png");
await processFile(inputPath, outputPath);
