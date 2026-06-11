import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const files = [
  { input: "kai level 2.png", output: "kai-level-2.png" },
  { input: "kai level 3.png", output: "kai-level-3.png" },
  { input: "kai level 4.png", output: "kai-level-4.png" },
];

async function removeWhiteBg(inputName, outputName) {
  const inputPath = path.join(root, "avatars", inputName);
  const outputPath = path.join(root, "public", "avatars", outputName);

  console.log(`\n📂 Processing: ${inputName}`);

  const image = sharp(inputPath);
  const { width, height } = await image.metadata();
  console.log(`   Size: ${width}x${height}`);

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  const whiteThreshold = 200;
  let removed = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    // Gri/beyaz arka plan: tüm kanallar threshold üstü ve birbirine yakın
    if (r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold && diff < 30) {
      pixels[i + 3] = 0;
      removed++;
    }
  }

  console.log(`   Removed ${removed} near-white pixels`);

  await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(outputPath);

  console.log(`   ✅ Saved: ${outputName}`);
}

async function main() {
  for (const f of files) {
    await removeWhiteBg(f.input, f.output);
  }
  console.log("\n✅ All done!");
}

main().catch(console.error);
