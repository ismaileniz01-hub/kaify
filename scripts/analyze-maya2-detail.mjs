/**
 * dr maya 2.png detaylı analiz - karakterde mavi var mı?
 */
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function analyze() {
  const inputPath = join(root, "public", "avatars", "dr maya 2.png");
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const buffer = Buffer.from(data);

  // Merkez bölgedeki (karakterin olduğu yer) mavi pikseller
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const radius = Math.min(width, height) / 4;

  let blueInCenter = 0;
  let totalInCenter = 0;

  for (let y = cy - radius; y < cy + radius; y++) {
    for (let x = cx - radius; x < cx + radius; x++) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const i = (y * width + x) * channels;
      const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
      totalInCenter++;
      if (b > r && b > g) {
        blueInCenter++;
        if (blueInCenter <= 10) {
          console.log(`  Merkezde mavi: (${x},${y}) R=${r} G=${g} B=${b}`);
        }
      }
    }
  }
  console.log(`\nMerkez bölge: ${blueInCenter}/${totalInCenter} mavi piksel (${(blueInCenter/totalInCenter*100).toFixed(1)}%)`);

  // Kenarlardaki mavi pikseller
  let blueOnEdge = 0;
  let totalOnEdge = 0;
  for (let x = 0; x < width; x++) {
    for (const y of [0, height-1]) {
      const i = (y * width + x) * channels;
      const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
      totalOnEdge++;
      if (b > r && b > g) blueOnEdge++;
    }
  }
  for (let y = 1; y < height-1; y++) {
    for (const x of [0, width-1]) {
      const i = (y * width + x) * channels;
      const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
      totalOnEdge++;
      if (b > r && b > g) blueOnEdge++;
    }
  }
  console.log(`Kenar bölge: ${blueOnEdge}/${totalOnEdge} mavi piksel (${(blueOnEdge/totalOnEdge*100).toFixed(1)}%)`);
}

analyze().catch(console.error);
