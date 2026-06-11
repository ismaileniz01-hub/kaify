/**
 * alex 2.png (yeşil arka plan) ve dr maya 2.png (mavi arka plan) temizler.
 * 
 * alex 2: G > R ve G > B olan pikselleri sil (yeşil)
 * dr maya 2: B > R ve B > G olan pikselleri sil (mavi)
 */
import sharp from "sharp";
import { renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function processFile(inputPath, outputPath, mode) {
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
      
      let isBg = false;
      if (mode === "green") {
        // Yeşil: G > R ve G > B
        isBg = g > r && g > b;
      } else if (mode === "blue") {
        // Mavi: B > R ve B > G
        isBg = b > r && b > g;
      }

      if (isBg) {
        buffer[i + 3] = 0;
        bgCount++;
      }
    }
  }

  console.log(`  Temizlenen: ${bgCount} / ${width * height}`);

  const temp = outputPath + ".tmp.png";
  await sharp(buffer, { raw: { width, height, channels } })
    .png()
    .toFile(temp);

  renameSync(temp, outputPath);
  console.log("OK:", outputPath);
}

// alex 2.png - yeşil arka plan
console.log("\nİşleniyor: alex 2.png (yeşil)");
await processFile(
  join(root, "public", "avatars", "alex 2.png"),
  join(root, "public", "avatars", "alex 2.png"),
  "green"
);

// dr maya 2.png - mavi arka plan
console.log("\nİşleniyor: dr maya 2.png (mavi)");
await processFile(
  join(root, "public", "avatars", "dr maya 2.png"),
  join(root, "public", "avatars", "dr maya 2.png"),
  "blue"
);
