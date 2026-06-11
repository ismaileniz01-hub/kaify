import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Orijinal dosyayı analiz et
const inputPath = path.join(root, "avatars", "kai level 4.png");

async function analyze() {
  const image = sharp(inputPath);
  const { width, height } = await image.metadata();
  console.log(`📐 Size: ${width}x${height}`);

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);

  // Üst 50 satırı analiz et
  console.log("\n=== ÜST 50 SATIR ANALİZİ ===");
  for (let y = 0; y < Math.min(50, height); y++) {
    let whiteCount = 0;
    let totalVisible = 0;
    let firstWhite = -1;
    let lastWhite = -1;
    
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];
      
      if (a > 0) {
        totalVisible++;
        if (r > 200 && g > 200 && b > 200) {
          whiteCount++;
          if (firstWhite === -1) firstWhite = x;
          lastWhite = x;
        }
      }
    }
    
    if (totalVisible > 0) {
      console.log(`Satır ${y}: ${totalVisible} görünür piksel, ${whiteCount} beyaz, x: ${firstWhite}-${lastWhite}`);
    }
  }

  // Tüm görseldeki beyaz piksellerin Y dağılımı
  console.log("\n=== TÜM BEYAZ PİKSELLERİN Y DAĞILIMI ===");
  const yDist = new Map();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];
      
      if (a > 0 && r > 200 && g > 200 && b > 200) {
        yDist.set(y, (yDist.get(y) || 0) + 1);
      }
    }
  }
  
  const sorted = [...yDist.entries()].sort((a, b) => a[0] - b[0]);
  for (const [y, count] of sorted) {
    console.log(`  y=${y}: ${count} beyaz piksel`);
  }
}

analyze().catch(console.error);
