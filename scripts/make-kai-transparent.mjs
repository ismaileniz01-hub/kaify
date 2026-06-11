import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const input = join(root, "public", "kai-mascot-source.png");
const output = join(root, "public", "kai-mascot.png");

const { data, info } = await sharp(input)
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

  // Remove near-white background; keep purple dragon pixels
  if (brightness > 235 && colorSpread < 25) {
    data[i + 3] = 0;
  } else if (brightness > 210 && whiteness > 200 && colorSpread < 35) {
    data[i + 3] = Math.round(255 * (1 - (brightness - 210) / 45));
  }
}

await sharp(data, { raw: { width, height, channels } })
  .png()
  .toFile(output);

console.log("Wrote", output);
