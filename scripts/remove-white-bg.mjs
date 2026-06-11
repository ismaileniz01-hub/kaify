import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const input = process.argv[2];
const output = process.argv[3];

if (!input || !output) {
  console.error("Usage: node remove-white-bg.mjs <input> <output>");
  process.exit(1);
}

const inputPath = join(root, input);
const outputPath = join(root, output);

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
  const whiteness = Math.min(r, g, b);
  const colorSpread = Math.max(r, g, b) - Math.min(r, g, b);

  if (brightness > 238 && colorSpread < 28) {
    data[i + 3] = 0;
  } else if (brightness > 215 && whiteness > 205 && colorSpread < 40) {
    data[i + 3] = Math.round(255 * (1 - (brightness - 215) / 40));
  }
}

await sharp(data, { raw: { width, height, channels } })
  .png()
  .toFile(outputPath);

console.log("Wrote", outputPath);
