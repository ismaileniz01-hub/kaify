import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const inputPath = join(root, "public", "kaify-logo.png");
const outputPath = join(root, "public", "kaify-logo-processed.png");

const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;

for (let i = 0; i < data.length; i += channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const brightness = (r + g + b) / 3;

  // Sadece logo dışındaki saf siyah alanları şeffaf yap
  if (brightness < 28 && r < 35 && g < 35 && b < 35) {
    data[i + 3] = 0;
  }
}

await sharp(data, { raw: { width, height, channels } })
  .png()
  .toFile(outputPath);

import { renameSync } from "fs";
renameSync(outputPath, inputPath);
console.log("Wrote", inputPath);
