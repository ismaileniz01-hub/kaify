/**
 * Sadece dr maya 1.png'deki mavi arka planı temizler.
 * Kenar rengini analiz eder, flood fill ile sadece o renge yakın
 * ve kenarlardan bağlantılı pikselleri temizler.
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

  // 1. AŞAMA: Kenar piksellerini analiz et
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

  const avgR = totalR / count;
  const avgG = totalG / count;
  const avgB = totalB / count;
  console.log(`  Ortalama kenar: R=${avgR.toFixed(0)} G=${avgG.toFixed(0)} B=${avgB.toFixed(0)}`);

  // 2. AŞAMA: Flood fill ile arka planı bul
  const threshold = 70;
  const visited = new Array(width * height).fill(false);
  const isBg = new Array(width * height).fill(false);
  const stack = [];

  function isBgColor(r, g, b) {
    const dr = Math.abs(r - avgR);
    const dg = Math.abs(g - avgG);
    const db = Math.abs(b - avgB);
    return dr < threshold && dg < threshold && db < threshold;
  }

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

  // 3. AŞAMA: Arka planı şeffaf yap
  let bgCount = 0;
  for (let i = 0; i < buffer.length; i += channels) {
    const idx = i / channels;
    if (isBg[idx]) {
      buffer[i + 3] = 0;
      bgCount++;
    }
  }
  console.log(`  Temizlenen: ${bgCount} / ${width * height}`);

  // 4. AŞAMA: Kenar yumuşatma
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (buffer[i + 3] === 0) continue;

      let touchesTransparent = false;
      for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (buffer[(ny * width + nx) * channels + 3] === 0) {
          touchesTransparent = true;
          break;
        }
      }

      if (touchesTransparent) {
        buffer[i + 3] = Math.round(buffer[i + 3] * 0.5);
      }
    }
  }

  const temp = outputPath + ".tmp.png";
  await sharp(buffer, { raw: { width, height, channels } })
    .png()
    .toFile(temp);

  renameSync(temp, outputPath);
  console.log("OK:", outputPath);
}

const inputPath = join(root, "public", "avatars", "dr maya 1.png");
const outputPath = join(root, "public", "avatars", "dr maya 1.png");
console.log("\nİşleniyor: dr maya 1.png");
await processFile(inputPath, outputPath);
