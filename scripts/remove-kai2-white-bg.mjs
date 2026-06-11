import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const inputPath = path.join(root, "avatars", "kai level 2.png");
const outputPath = path.join(root, "public", "avatars", "kai-level-2.png");

async function removeWhiteBg() {
  console.log("📂 Input:", inputPath);
  console.log("📂 Output:", outputPath);

  const image = sharp(inputPath);
  const { width, height } = await image.metadata();
  console.log(`📐 Size: ${width}x${height}`);

  // RGBA olarak oku
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log(`📊 Channels: ${info.channels}, Buffer length: ${data.length}`);

  const pixels = Buffer.from(data);
  const whiteThreshold = 240; // 240+ olan tüm kanalları beyaz kabul et

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    // Eğer piksel beyaza yakınsa (tüm RGB kanalları 240+), saydam yap
    if (r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold) {
      pixels[i + 3] = 0; // alpha = 0 (tam saydam)
    }
  }

  // Yeni PNG olarak kaydet
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
