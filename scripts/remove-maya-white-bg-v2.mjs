/**
 * Dr. Maya resimlerindeki beyaz arka planı temizler (v2 - daha agresif)
 * Önce resmin ne renk olduğunu analiz eder, sonra uygun eşik değerini kullanır.
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

  // 1. AŞAMA: Kenar piksellerini analiz et - arka plan rengini bul
  let totalR = 0, totalG = 0, totalB = 0, count = 0;
  
  // Üst kenar
  for (let x = 0; x < width; x++) {
    const i = x * channels;
    totalR += buffer[i]; totalG += buffer[i+1]; totalB += buffer[i+2]; count++;
  }
  // Alt kenar
  for (let x = 0; x < width; x++) {
    const i = ((height-1) * width + x) * channels;
    totalR += buffer[i]; totalG += buffer[i+1]; totalB += buffer[i+2]; count++;
  }
  // Sol kenar
  for (let y = 0; y < height; y++) {
    const i = (y * width) * channels;
    totalR += buffer[i]; totalG += buffer[i+1]; totalB += buffer[i+2]; count++;
  }
  // Sağ kenar
  for (let y = 0; y < height; y++) {
    const i = (y * width + (width-1)) * channels;
    totalR += buffer[i]; totalG += buffer[i+1]; totalB += buffer[i+2]; count++;
  }

  const avgR = totalR / count;
  const avgG = totalG / count;
  const avgB = totalB / count;

  console.log(`  Ortalama kenar rengi: R=${avgR.toFixed(0)} G=${avgG.toFixed(0)} B=${avgB.toFixed(0)}`);

  // Arka plan rengine göre eşik değerini belirle
  const threshold = 60; // Ortalama renkten bu kadar sapma toleransı

  // 2. AŞAMA: Flood fill ile arka planı bul
  const visited = new Array(width * height).fill(false);
  const isBg = new Array(width * height).fill(false);
  const stack = [];

  // Kenarlardaki arka plan piksellerini bul
  function isBgColor(r, g, b) {
    const dr = Math.abs(r - avgR);
    const dg = Math.abs(g - avgG);
    const db = Math.abs(b - avgB);
    return dr < threshold && dg < threshold && db < threshold;
  }

  // Kenarlardan başla
  for (let x = 0; x < width; x++) {
    const idx1 = x;
    const idx2 = (height - 1) * width + x;
    const i1 = idx1 * channels;
    const i2 = idx2 * channels;
    if (isBgColor(buffer[i1], buffer[i1+1], buffer[i1+2])) stack.push(idx1);
    if (isBgColor(buffer[i2], buffer[i2+1], buffer[i2+2])) stack.push(idx2);
  }
  for (let y = 0; y < height; y++) {
    const idx1 = y * width;
    const idx2 = y * width + (width - 1);
    const i1 = idx1 * channels;
    const i2 = idx2 * channels;
    if (isBgColor(buffer[i1], buffer[i1+1], buffer[i1+2])) stack.push(idx1);
    if (isBgColor(buffer[i2], buffer[i2+1], buffer[i2+2])) stack.push(idx2);
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

  // 3. AŞAMA: Arka plan piksellerini şeffaf yap
  let bgCount = 0;
  for (let i = 0; i < buffer.length; i += channels) {
    const idx = i / channels;
    if (isBg[idx]) {
      buffer[i + 3] = 0;
      bgCount++;
    }
  }
  console.log(`  Temizlenen piksel: ${bgCount} / ${width * height}`);

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

const files = [
  ["dr maya 1.png", "dr maya 1.png"],
  ["Dr maya 2.png", "Dr maya 2.png"],
];

for (const [input, output] of files) {
  const inputPath = join(root, "public", "avatars", input);
  const outputPath = join(root, "public", "avatars", output);
  console.log(`\nİşleniyor: ${input}`);
  await processFile(inputPath, outputPath);
}
