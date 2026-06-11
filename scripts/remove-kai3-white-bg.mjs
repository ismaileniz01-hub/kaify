import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const inputPath = path.join(root, "avatars", "kai level 3.png");
const outputPath = path.join(root, "public", "avatars", "kai-level-3.png");

async function removeWhiteBg() {
  console.log("📂 Input:", inputPath);
  console.log("📂 Output:", outputPath);

  const image = sharp(inputPath);
  const { width, height } = await image.metadata();
  console.log(`📐 Size: ${width}x${height}`);

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log(`📊 Channels: ${info.channels}, Buffer length: ${data.length}`);

  const pixels = Buffer.from(data);
  const whiteThreshold = 240;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    if (r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold) {
      pixels[i + 3] = 0;
    }
  }

  await sharp(pixels, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toFile(outputPath);

  console.log("✅ Beyaz arka plan temizlendi!");
  console.log("✅ Kaydedildi:", outputPath);
}

removeWhiteBg().catch(console.error);
