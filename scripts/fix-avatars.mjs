/**
 * Avatar sorunlarını düzeltir:
 * 1. Maya & Leo — sağdaki ince beyaz çizgiyi kaldır
 * 2. Kai — mor noktalama efektini kaldır
 */
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function fixAvatar(inputPath, outputPath, options = {}) {
  const { cropRight = 0, removeMagenta = false } = options;

  let img = sharp(inputPath);
  let metadata = await img.metadata();

  if (cropRight > 0) {
    // Sağdaki ince beyaz çizgiyi kırp
    img = sharp(inputPath).extract({
      left: 0,
      top: 0,
      width: metadata.width - cropRight,
      height: metadata.height,
    });
    metadata = await img.metadata();
  }

  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Beyaz arka planı temizle (daha agresif)
    const brightness = (r + g + b) / 3;
    const whiteness = Math.min(r, g, b);
    const colorSpread = Math.max(r, g, b) - Math.min(r, g, b);

    if (brightness > 230 && colorSpread < 30) {
      data[i + 3] = 0;
    } else if (brightness > 200 && whiteness > 190 && colorSpread < 50) {
      data[i + 3] = Math.round(255 * (1 - (brightness - 200) / 55));
    }

    // Kai — parlama/glow efektlerini kaldır
    if (removeMagenta) {
      // Parlak mor/pembe noktalar (yıldız/ışıltı efektleri)
      const isBrightGlow =
        ((r > 200 && b > 200 && g > 150) || // beyazımsı parlak
         (r > 180 && b > 200 && g < 150)) && // mor parlak
        a > 0 && a < 250;

      // Düşük opaklıklı mor sis/glow
      const isPurpleHaze =
        b > r * 0.6 && r > g * 1.3 && g < 180 && a < 180;

      // Yüksek parlaklıkta doygun olmayan pikseller (glow)
      const isGlow =
        (r + g + b) / 3 > 200 &&
        Math.max(r, g, b) - Math.min(r, g, b) < 60 &&
        a < 200;

      // Mor tonlu parlamalar
      const isPurpleGlow =
        b > r * 0.5 && b > g && r > g && (r + b) / 2 > g + 20 && a < 220;

      if (isBrightGlow || isPurpleHaze || isGlow || isPurpleGlow) {
        data[i + 3] = 0;
      }
    }

  }

  const temp = outputPath + ".tmp.png";
  await sharp(data, { raw: { width, height, channels } }).png().toFile(temp);

  // renameSync
  const { renameSync } = await import("fs");
  renameSync(temp, outputPath);
  console.log("Fixed:", outputPath);
}

const avatarsDir = join(root, "public", "avatars");

// Maya — sağdan 2px kırp + beyaz temizlik
await fixAvatar(join(avatarsDir, "maya.png"), join(avatarsDir, "maya.png"), {
  cropRight: 2,
});

// Leo — sağdan 2px kırp + beyaz temizlik
await fixAvatar(join(avatarsDir, "leo.png"), join(avatarsDir, "leo.png"), {
  cropRight: 2,
});

// Alex — sadece beyaz temizlik
await fixAvatar(join(avatarsDir, "alex.png"), join(avatarsDir, "alex.png"));

// Kai — mor noktaları kaldır
await fixAvatar(join(root, "public", "kai-mascot.png"), join(root, "public", "kai-mascot.png"), {
  removeMagenta: true,
});

console.log("All avatars fixed!");
