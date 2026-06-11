import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const inputPath = path.join(root, "public", "avatars", "kai-level-4.png");

async function analyze() {
  const image = sharp(inputPath);
  const { width, height } = await image.metadata();
  console.log(`📐 Size: ${width}x${height}`);

  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);

  // Üst 30 satırı analiz et
  console.log("\n=== ÜST 30 SATIR ANALİZİ ===");
  for (let y = 0; y < Math.min(30, height); y++) {
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
    
    if (whiteCount > 0) {
      console.log(`Satır ${y}: ${whiteCount} beyaz piksel (görünür: ${totalVisible}), x: ${firstWhite}-${lastWhite}`);
    }
  }

  // Tüm görseldeki beyaz piksellerin dağılımı
  console.log("\n=== BEYAZ PİKSELLERİN RENK ANALİZİ ===");
  const whitePixels = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];
      
      if (a > 0 && r > 200 && g > 200 && b > 200) {
        whitePixels.push({ x, y, r, g, b, a });
      }
    }
  }
  
  console.log(`Toplam beyaz piksel: ${whitePixels.length}`);
  
  // Beyaz piksellerin Y koordinatlarına göre dağılımı
  const yDistribution = new Map();
  for (const p of whitePixels) {
    yDistribution.set(p.y, (yDistribution.get(p.y) || 0) + 1);
  }
  
  const sortedY = [...yDistribution.entries()].sort((a, b) => a[0] - b[0]);
  console.log("\nY koordinatına göre beyaz piksel dağılımı (ilk 50 satır):");
  for (const [y, count] of sortedY.slice(0, 50)) {
    console.log(`  y=${y}: ${count} piksel`);
  }
  
  // En üstteki beyaz piksellerin tam konumu
  const topWhitePixels = whitePixels.filter(p => p.y < 30);
  if (topWhitePixels.length > 0) {
    console.log(`\n=== ÜST 30 SATIRDAKİ BEYAZ PİKSELLER ===`);
    // Grup by y
    const byY = new Map();
    for (const p of topWhitePixels) {
      if (!byY.has(p.y)) byY.set(p.y, []);
      byY.get(p.y).push(p);
    }
    for (const [y, pixels] of [...byY.entries()].sort((a, b) => a[0] - b[0])) {
      const xs = pixels.map(p => p.x).sort((a, b) => a - b);
      console.log(`  y=${y}: x=${xs[0]}-${xs[xs.length-1]} (${pixels.length} piksel)`);
    }
  }
}

analyze().catch(console.error);
