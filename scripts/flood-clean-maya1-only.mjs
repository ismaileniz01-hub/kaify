/**
 * dr maya 1.png flood fill - sadece kenar rengine yakın pikseller
 * Mavi ton koşulu yok, karakterdeki hiçbir renge dokunmaz.
 */
import sharp from "sharp";
import { renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function processFile(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const buffer = Buffer.from(data);

  const avgR = 45, avgG = 96, avgB = 154;
  const threshold = 80;

  console.log(`Hedef renk: R=${avgR} G=${avgG} B=${avgB}, threshold=${threshold}`);

  const visited = new Array(width * height).fill(false);
  const isBg = new Array(width * height).fill(false);
  const stack = [];

  function isBgColor(r, g, b) {
    const dr = Math.abs(r - avgR);
    const dg = Math.abs(g - avgG);
    const db = Math.abs(b - avgB);
    return dr < threshold && dg < threshold && db < threshold;
  }

  // Kenarlardan başla
  for (let x = 0; x < width; x++) {
    stack.push(x);
    stack.push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width);
    stack.push(y * width + (width - 1));
  }

  while (stack.length > 0) {
    const idx = stack.pop();
    if (visited[idx]) continue;
    visited[idx] = true;

    const y = Math.floor(idx / width);
    const x = idx % width;
    const i = idx * channels;
    const r = buffer[i], g = buffer[i+1], b = buffer[i+2];

    if (!isBgColor(r, g, b)) continue;

    isBg[idx] = true;

    for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIdx = ny * width + nx;
      if (!visited[nIdx]) stack.push(nIdx);
    }
  }

  let bgCount = 0;
  for (let i = 0; i < buffer.length; i += channels) {
    const idx = i / channels;
    if (isBg[idx]) {
      buffer[i + 3] = 0;
      bgCount++;
    }
  }
  console.log(`Temizlenen: ${bgCount} / ${width * height}`);

  const temp = outputPath + ".tmp.png";
  await sharp(buffer, { raw: { width, height, channels } })
    .png()
    .toFile(temp);

  renameSync(temp, outputPath);
  console.log("OK");
}

const inputPath = join(root, "public", "avatars", "dr maya 1.png");
const outputPath = join(root, "public", "avatars", "dr maya 1.png");
console.log("\ndr maya 1.png (sadece kenar rengi)");
await processFile(inputPath, outputPath);
