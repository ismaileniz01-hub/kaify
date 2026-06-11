/**
 * alex 2.png (yeşil) ve dr maya 2.png (mavi) flood fill ile temizler.
 * Sadece kenarlardan bağlantılı olan ve kenar rengine yakın pikselleri siler.
 */
import sharp from "sharp";
import { renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function processFile(inputPath, outputPath, label, avgR, avgG, avgB, threshold) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const buffer = Buffer.from(data);

  console.log(`\n${label}`);
  console.log(`  Hedef renk: R=${avgR} G=${avgG} B=${avgB}, threshold=${threshold}`);

  // Flood fill
  const visited = new Array(width * height).fill(false);
  const isBg = new Array(width * height).fill(false);
  const stack = [];

  function isBgColor(r, g, b) {
    const dr = Math.abs(r - avgR);
    const dg = Math.abs(g - avgG);
    const db = Math.abs(b - avgB);
    return dr < threshold && dg < threshold && db < threshold;
  }

  // Tüm kenarlardan başla
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
      if (!visited[nIdx]) {
        stack.push(nIdx);
      }
    }
  }

  // Arka planı şeffaf yap
  let bgCount = 0;
  for (let i = 0; i < buffer.length; i += channels) {
    const idx = i / channels;
    if (isBg[idx]) {
      buffer[i + 3] = 0;
      bgCount++;
    }
  }
  console.log(`  Temizlenen: ${bgCount} / ${width * height}`);

  const temp = outputPath + ".tmp.png";
  await sharp(buffer, { raw: { width, height, channels } })
    .png()
    .toFile(temp);

  renameSync(temp, outputPath);
  console.log("OK");
}

// alex 2.png - yeşil arka plan (kenar: R=47 G=176 B=52)
await processFile(
  join(root, "public", "avatars", "alex 2.png"),
  join(root, "public", "avatars", "alex 2.png"),
  "alex 2.png (yeşil flood fill)", 47, 176, 52, 60
);

// dr maya 2.png - mavi arka plan (kenar: R=45 G=96 B=154)
await processFile(
  join(root, "public", "avatars", "dr maya 2.png"),
  join(root, "public", "avatars", "dr maya 2.png"),
  "dr maya 2.png (mavi flood fill)", 45, 96, 154, 60
);
