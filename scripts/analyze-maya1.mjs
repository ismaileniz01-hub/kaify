/**
 * dr maya 1.png'yi analiz eder - kenar renklerini ve renk dağılımını gösterir
 */
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function analyze() {
  const inputPath = join(root, "public", "avatars", "dr maya 1.png");
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const buffer = Buffer.from(data);

  // Kenar piksellerini analiz et
  console.log("=== KENAR PİKSELLERİ ===");
  let edgeColors = [];
  
  // Üst kenar (ilk 5 satır)
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < width; x += 50) {
      const i = (y * width + x) * channels;
      edgeColors.push({x, y, r: buffer[i], g: buffer[i+1], b: buffer[i+2]});
    }
  }
  // Alt kenar (son 5 satır)
  for (let y = height - 5; y < height; y++) {
    for (let x = 0; x < width; x += 50) {
      const i = (y * width + x) * channels;
      edgeColors.push({x, y, r: buffer[i], g: buffer[i+1], b: buffer[i+2]});
    }
  }
  // Sol kenar
  for (let y = 0; y < height; y += 50) {
    for (let x = 0; x < 5; x++) {
      const i = (y * width + x) * channels;
      edgeColors.push({x, y, r: buffer[i], g: buffer[i+1], b: buffer[i+2]});
    }
  }
  // Sağ kenar
  for (let y = 0; y < height; y += 50) {
    for (let x = width - 5; x < width; x++) {
      const i = (y * width + x) * channels;
      edgeColors.push({x, y, r: buffer[i], g: buffer[i+1], b: buffer[i+2]});
    }
  }

  // Benzersiz renkleri grupla
  const colorGroups = {};
  for (const c of edgeColors) {
    const key = `${Math.round(c.r/20)*20},${Math.round(c.g/20)*20},${Math.round(c.b/20)*20}`;
    if (!colorGroups[key]) colorGroups[key] = {count: 0, r: 0, g: 0, b: 0};
    colorGroups[key].count++;
    colorGroups[key].r += c.r;
    colorGroups[key].g += c.g;
    colorGroups[key].b += c.b;
  }

  const sorted = Object.entries(colorGroups).sort((a, b) => b[1].count - a[1].count);
  for (const [key, val] of sorted.slice(0, 10)) {
    const avgR = (val.r / val.count).toFixed(0);
    const avgG = (val.g / val.count).toFixed(0);
    const avgB = (val.b / val.count).toFixed(0);
    console.log(`  Renk ~(${avgR},${avgG},${avgB}) - ${val.count} piksel`);
  }

  // Tüm resimdeki renk dağılımı
  console.log("\n=== TÜM RESİM RENK DAĞILIMI ===");
  const allColors = {};
  for (let i = 0; i < buffer.length; i += channels) {
    const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
    const key = `${Math.round(r/30)*30},${Math.round(g/30)*30},${Math.round(b/30)*30}`;
    if (!allColors[key]) allColors[key] = 0;
    allColors[key]++;
  }

  const sortedAll = Object.entries(allColors).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sortedAll.slice(0, 15)) {
    const pct = (count / (width * height) * 100).toFixed(1);
    console.log(`  Renk (${key}) - ${count} piksel (${pct}%)`);
  }
}

analyze().catch(console.error);
