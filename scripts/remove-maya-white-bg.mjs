/**
 * Dr. Maya resimlerindeki beyaz arka planı temizler.
 * Karakter üzerindeki beyazları korur.
 * Strateji: Beyaz arka plan genelde düz beyazdır (R≈G≈B≈255).
 * Karakter üzerindeki beyazlar ise gölgeli/renkli geçişler içerir.
 * 
 * Sadece R>240, G>240, B>240 olan ve çevresinde de beyaz olan pikselleri temizler.
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

  // 1. AŞAMA: Beyaz arka plan piksellerini tespit et
  // Beyaz arka plan: R>245, G>245, B>245 (neredeyse saf beyaz)
  // Karakter üzerindeki beyaz: daha düşük değerler veya renk tonu farkı
  const isBg = new Array(width * height).fill(false);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
      
      // Saf beyaza yakın pikseller
      if (r > 245 && g > 245 && b > 245) {
        isBg[y * width + x] = true;
      }
    }
  }

  // 2. AŞAMA: Flood fill - beyaz arka plan alanlarını bul
  // Kenarlardan başlayarak beyaz alanları işaretle
  const visited = new Array(width * height).fill(false);
  const stack = [];

  // Üst ve alt kenarlar
  for (let x = 0; x < width; x++) {
    if (isBg[x]) stack.push(x);
    if (isBg[(height - 1) * width + x]) stack.push((height - 1) * width + x);
  }
  // Sol ve sağ kenarlar
  for (let y = 0; y < height; y++) {
    if (isBg[y * width]) stack.push(y * width);
    if (isBg[y * width + (width - 1)]) stack.push(y * width + (width - 1));
  }

  const bgArea = new Array(width * height).fill(false);

  while (stack.length > 0) {
    const idx = stack.pop();
    if (visited[idx]) continue;
    visited[idx] = true;

    if (!isBg[idx]) continue;

    bgArea[idx] = true;

    const y = Math.floor(idx / width);
    const x = idx % width;

    // 4 yönlü komşular
    for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIdx = ny * width + nx;
      if (!visited[nIdx] && isBg[nIdx]) {
        stack.push(nIdx);
      }
    }
  }

  // 3. AŞAMA: Beyaz arka plan alanındaki pikselleri şeffaf yap
  for (let i = 0; i < buffer.length; i += channels) {
    const idx = i / channels;
    if (bgArea[idx]) {
      buffer[i + 3] = 0;
    }
  }

  // 4. AŞAMA: Kenar yumuşatma - şeffaf alana komşu beyaz pikselleri yarı şeffaf yap
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const idx = y * width + x;
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
        const r = buffer[i], g = buffer[i+1], b = buffer[i+2];
        // Beyazımsı kenarları yarı şeffaf yap
        if (r > 230 && g > 230 && b > 230) {
          buffer[i + 3] = 128; // yarı şeffaf
        }
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
  await processFile(inputPath, outputPath);
}
