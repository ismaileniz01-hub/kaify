/**
 * dr maya 1.png - Yeniden düzenleme
 * 
 * Sadece avatars/dr maya 1.png dosyasını kullan.
 * Tüm beyaz alanları koru, karakterin iç boşluklarını doldur.
 */
import sharp from "sharp";
import { renameSync, copyFileSync } from "fs";
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

  console.log(`Boyut: ${width}x${height}, Kanallar: ${channels}`);

  // 1. Tüm bağlantılı bileşenleri bul
  const visited = new Uint8Array(width * height);
  const components = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const i = idx * channels;
      if (buffer[i + 3] === 0) continue;

      const stack = [idx];
      const pixels = [];
      visited[idx] = 1;

      while (stack.length > 0) {
        const cIdx = stack.pop();
        const cy = Math.floor(cIdx / width);
        const cx = cIdx % width;
        pixels.push(cIdx);

        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (visited[nIdx]) continue;
          const ni = nIdx * channels;
          if (buffer[ni + 3] === 0) continue;
          visited[nIdx] = 1;
          stack.push(nIdx);
        }
      }

      components.push({ size: pixels.length, pixels });
    }
  }

  console.log(`Toplam bileşen: ${components.length}`);

  // 2. Tüm bileşenleri koru (hiçbirini silme)
  const keepPixels = new Set();
  for (const c of components) {
    for (const idx of c.pixels) {
      keepPixels.add(idx);
    }
  }

  console.log(`Korunan: ${components.length} bileşen (${keepPixels.size} piksel)`);

  // 3. Bounding box
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (const idx of keepPixels) {
    const x = idx % width;
    const y = Math.floor(idx / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  
  console.log(`Bounding box: (${minX},${minY}) - (${maxX},${maxY})`);

  // 4. Bounding box içindeki boşlukları doldur
  let filled = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;
      if (keepPixels.has(idx)) continue;
      
      const i = idx * channels;
      if (buffer[i + 3] > 0) continue;

      // 8 yönlü kontrol
      let surroundR = 0, surroundG = 0, surroundB = 0, surroundCount = 0;
      
      for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1],[x+1,y+1],[x-1,y-1],[x+1,y-1],[x-1,y+1]]) {
        if (nx < minX || ny < minY || nx > maxX || ny > maxY) continue;
        const nIdx = ny * width + nx;
        if (keepPixels.has(nIdx)) {
          const ni = nIdx * channels;
          surroundR += buffer[ni];
          surroundG += buffer[ni + 1];
          surroundB += buffer[ni + 2];
          surroundCount++;
        }
      }

      if (surroundCount >= 4) {
        buffer[i] = Math.round(surroundR / surroundCount);
        buffer[i + 1] = Math.round(surroundG / surroundCount);
        buffer[i + 2] = Math.round(surroundB / surroundCount);
        buffer[i + 3] = 255;
        keepPixels.add(idx);
        filled++;
      }
    }
  }

  console.log(`Doldurulan boşluk: ${filled} piksel`);

  // Kaydet
  const temp = outputPath + ".tmp.png";
  await sharp(buffer, { raw: { width, height, channels } })
    .png()
    .toFile(temp);

  renameSync(temp, outputPath);
  console.log("OK - kaydedildi:", outputPath);
}

// Sadece avatars/dr maya 1.png'yi kullan
const source = join(root, "avatars", "dr maya 1.png");
const targets = [
  join(root, "avatars", "dr maya 1.png"),
  join(root, "public", "avatars", "dr maya 1.png"),
  join(root, "public", "avatars", "maya.png"),
];

console.log("=== Kaynak:", source, "===");
await processFile(source, source);

// Aynı dosyayı public'e kopyala
for (const t of targets) {
  if (t !== source) {
    copyFileSync(source, t);
    console.log("Kopyalandı:", t);
  }
}
