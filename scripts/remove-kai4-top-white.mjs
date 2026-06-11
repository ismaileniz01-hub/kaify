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
  
  // Aşama 1: Tüm beyaz/açık renkli pikselleri temizle (arka plan)
  // Daha agresif threshold: 180+ olan her şeyi temizle
  const whiteThreshold = 180;
  // Ama Kai'nin kendisindeki beyaz tonları korumak için
  // sadece birbirine çok yakın renkleri (gri/beyaz) temizle
  const colorDiffThreshold = 40;

  let removed = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    // Eğer tüm kanallar threshold üstü ve renk farkı azsa (beyaz/gri)
    if (r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold && diff < colorDiffThreshold) {
      pixels[i + 3] = 0;
      removed++;
    }
  }

  console.log(`🧹 Removed ${removed} near-white pixels (threshold: ${whiteThreshold}, diff: ${colorDiffThreshold})`);

  // Aşama 2: Üst kısımdaki kalan beyaz çizgileri temizle
  // İlk 10 satırda kalan beyaz pikselleri zorla temizle
  let topRemoved = 0;
  for (let y = 0; y < Math.min(15, height); y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];

      // Hala görünür olan (alpha > 0) ve açık renkli pikselleri temizle
      if (a > 0 && r > 150 && g > 150 && b > 150) {
        pixels[idx + 3] = 0;
        topRemoved++;
      }
    }
  }
  console.log(`🧹 Removed ${topRemoved} top-edge white pixels`);

  // Aşama 3: Kenarlardaki beyaz pikselleri temizle (sol ve sağ)
  let edgeRemoved = 0;
  for (let y = 0; y < height; y++) {
    // Sol kenar (ilk 5 piksel)
    for (let x = 0; x < Math.min(5, width); x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];
      if (a > 0 && r > 150 && g > 150 && b > 150) {
        pixels[idx + 3] = 0;
        edgeRemoved++;
      }
    }
    // Sağ kenar (son 5 piksel)
    for (let x = Math.max(0, width - 5); x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];
      if (a > 0 && r > 150 && g > 150 && b > 150) {
        pixels[idx + 3] = 0;
        edgeRemoved++;
      }
    }
  }
  console.log(`🧹 Removed ${edgeRemoved} edge white pixels`);

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
