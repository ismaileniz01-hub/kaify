/**
 * alex 2.png detaylı analiz - karakterde yeşil var mı?
 */
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function analyze() {
  const inputPath = join(root, "public", "avatars", "alex 2.png");
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const buffer = Buffer.from(data);

  // Merkez bölgedeki (karakterin olduğu yer) yeşil pikseller
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const radius = Math.min(width, height) / 4;

  let greenInCenter = 0;
  let totalInCenter = 0;

  for (let y = cy - radius; y < cy + radius; y++) {
    for (let x = cx - radius; x < cx + radius; x++) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const i = (y * width + x) * channels;
      const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
      totalInCenter++;
      if (g > r && g > b) {
        greenInCenter++;
        if (greenInCenter <= 20) {
          console.log(`  Merkezde yeşil: (${x},${y}) R=${r} G=${g} B=${b}`);
        }
      }
    }
  }
  console.log(`\nMerkez bölge: ${greenInCenter}/${totalInCenter} yeşil piksel (${(greenInCenter/totalInCenter*100).toFixed(1)}%)`);

  // Kenarlardaki yeşil pikseller
  let greenOnEdge = 0;
  let totalOnEdge = 0;
  for (let x = 0; x < width; x++) {
    for (const y of [0, height-1]) {
      const i = (y * width + x) * channels;
      const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
      totalOnEdge++;
      if (g > r && g > b) greenOnEdge++;
    }
  }
  for (let y = 1; y < height-1; y++) {
    for (const x of [0, width-1]) {
      const i = (y * width + x) * channels;
      const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
      totalOnEdge++;
      if (g > r && g > b) greenOnEdge++;
    }
  }
  console.log(`Kenar bölge: ${greenOnEdge}/${totalOnEdge} yeşil piksel (${(greenOnEdge/totalOnEdge*100).toFixed(1)}%)`);

  // Yeşil olmayan ama arka plan olabilecek renkler
  console.log("\n=== KENARDAKİ YEŞİL OLMAYAN RENKLER ===");
  let nonGreenEdges = [];
  for (let x = 0; x < width; x += 10) {
    for (const y of [0, height-1]) {
      const i = (y * width + x) * channels;
      const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
      if (!(g > r && g > b)) {
        nonGreenEdges.push({x, y, r, g, b});
      }
    }
  }
  for (let y = 1; y < height-1; y += 10) {
    for (const x of [0, width-1]) {
      const i = (y * width + x) * channels;
      const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
      if (!(g > r && g > b)) {
        nonGreenEdges.push({x, y, r, g, b});
      }
    }
  }
  console.log(`  Yeşil olmayan kenar piksel sayısı: ${nonGreenEdges.length}`);
  // İlk 10 tanesini göster
  for (const c of nonGreenEdges.slice(0, 10)) {
    console.log(`  (${c.x},${c.y}) R=${c.r} G=${c.g} B=${c.b}`);
  }
}

analyze().catch(console.error);
