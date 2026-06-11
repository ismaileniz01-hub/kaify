/**
 * alex 2.png'yi analiz eder
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

  // Kenar piksellerini analiz et
  console.log("=== KENAR PİKSELLERİ ===");
  let totalR = 0, totalG = 0, totalB = 0, count = 0;
  for (let x = 0; x < width; x++) {
    const i1 = x * channels;
    const i2 = ((height-1) * width + x) * channels;
    totalR += buffer[i1]; totalG += buffer[i1+1]; totalB += buffer[i1+2]; count++;
    totalR += buffer[i2]; totalG += buffer[i2+1]; totalB += buffer[i2+2]; count++;
  }
  for (let y = 1; y < height-1; y++) {
    const i1 = (y * width) * channels;
    const i2 = (y * width + (width-1)) * channels;
    totalR += buffer[i1]; totalG += buffer[i1+1]; totalB += buffer[i1+2]; count++;
    totalR += buffer[i2]; totalG += buffer[i2+1]; totalB += buffer[i2+2]; count++;
  }
  console.log(`  Ortalama kenar: R=${(totalR/count).toFixed(0)} G=${(totalG/count).toFixed(0)} B=${(totalB/count).toFixed(0)}`);

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
