/**
 * Dr. Maya resimlerindeki TÜM mavi pikselleri yok eder.
 * Karakter üzerinde mavi olmadığı için direkt tespit et ve sil.
 * Mavi = B değeri R ve G'den büyük olan her piksel
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
      // Çok hafif mavimsi tonları da yakala
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

const files = [
  ["dr maya 1.png", "dr maya 1.png"],
  ["dr maya 2.png", "dr maya 2.png"],
];

for (const [input, output] of files) {
  const inputPath = join(root, "public", "avatars", input);
  const outputPath = join(root, "public", "avatars", output);
  console.log(`\nİşleniyor: ${input}`);
  await processFile(inputPath, outputPath);
}
