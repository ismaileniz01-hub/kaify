import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const inputPath = path.join(root, "avatars", "kai level 4.png");
const outputPath = path.join(root, "public", "avatars", "kai-level-4.png");

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
  
  // Aşama 1: Üst 30 satırdaki TÜM pikselleri temizle (arka plan çizgisi)
  let topRemoved = 0;
  for (let y = 0; y < Math.min(30, height); y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = pixels[idx + 3];
      if (a > 0) {
        pixels[idx + 3] = 0;
        topRemoved++;
      }
    }
  }
  console.log(`🧹 Removed ${topRemoved} top 30 rows pixels`);

  // Aşama 2: Kalan beyaz/açık renkli arka planı temizle
  let removed = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    if (a === 0) continue; // zaten saydam

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    // Beyaz/açık gri arka plan
    if (r >= 180 && g >= 180 && b >= 180 && diff < 50) {
      pixels[i + 3] = 0;
      removed++;
    }
  }
  console.log(`🧹 Removed ${removed} background white pixels`);

  // Aşama 3: Kenarlardaki (sol/sağ 3 piksel) tüm pikselleri temizle
  let edgeRemoved = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < Math.min(3, width); x++) {
      const idx = (y * width + x) * 4;
      if (pixels[idx + 3] > 0) {
        pixels[idx + 3] = 0;
        edgeRemoved++;
      }
    }
    for (let x = Math.max(0, width - 3); x < width; x++) {
      const idx = (y * width + x) * 4;
      if (pixels[idx + 3] > 0) {
        pixels[idx + 3] = 0;
        edgeRemoved++;
      }
    }
  }
  console.log(`🧹 Removed ${edgeRemoved} edge pixels`);

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
