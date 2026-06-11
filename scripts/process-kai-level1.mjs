/**
 * Kai level 1 avatarını işle:
 * 1. Beyaz arka planı temizle (karakter üstündeki beyazlar korunsun)
 * 2. Mor vurgulama efektini kaldır
 */
import sharp from "sharp";
import { renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const src = "C:\\Users\\İsmail\\OneDrive\\Masaüstü\\avatars\\Kai level 1.png";
const out = join(root, "public", "kai-mascot.png");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;

// Önce tüm pikselleri tara: hangi piksellerin beyaz arka plana ait olduğunu belirle
// Flood fill: kenarlardan başlayarak beyaz alanları bul
const size = width * height;
const visited = new Uint8Array(size);
const queue = [];

function isWhite(r, g, b) {
  // Beyaz: yüksek parlaklık, düşük renk farkı
  const brightness = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return brightness > 220 && spread < 40;
}

function tryPush(x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = y * width + x;
  if (visited[i]) return;
  const o = i * channels;
  if (!isWhite(data[o], data[o + 1], data[o + 2])) return;
  visited[i] = 1;
  queue.push(i);
}

// Kenarlardan başla
for (let x = 0; x < width; x++) {
  tryPush(x, 0);
  tryPush(x, height - 1);
}
for (let y = 0; y < height; y++) {
  tryPush(0, y);
  tryPush(width - 1, y);
}

while (queue.length > 0) {
  const i = queue.pop();
  const o = i * channels;
  data[o + 3] = 0; // şeffaf yap

  const x = i % width;
  const y = (i - x) / width;
  tryPush(x + 1, y);
  tryPush(x - 1, y);
  tryPush(x, y + 1);
  tryPush(x, y - 1);
}

// İkinci geçiş: kalan beyazımsı arka plan kalıntılarını ve mor efektleri temizle
for (let i = 0; i < data.length; i += channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];

  if (a === 0) continue;

  const brightness = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);

  // Kalan beyaz arka plan kalıntıları
  if (brightness > 200 && spread < 50) {
    data[i + 3] = 0;
    continue;
  }

  // Mor vurgulama efektleri
  const isPurpleish = b > r * 0.5 && r > g && b > g;
  const isPinkish = r > 150 && b > 100 && g < r * 0.7;
  
  if ((isPurpleish || isPinkish) && a < 230) {
    data[i + 3] = 0;
    continue;
  }

  // Düşük opaklıklı herhangi bir renkli piksel (efekt)
  if (a < 100) {
    data[i + 3] = 0;
    continue;
  }
}


const temp = out + ".tmp.png";
await sharp(data, { raw: { width, height, channels } }).png().toFile(temp);
renameSync(temp, out);
console.log("Kai level 1 processed:", out);
