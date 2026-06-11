/**
 * dr maya 1.png beyaz arka planını temizle
 */
import sharp from "sharp";
import { renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const src = join(root, "public", "avatars", "dr maya 1.png");
const out = join(root, "public", "avatars", "dr maya 1.png");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const size = width * height;
const visited = new Uint8Array(size);
const queue = [];

// Sadece saf beyaz (255,255,255) arka planı temizle
function isPureWhite(r, g, b) {
  return r >= 252 && g >= 252 && b >= 252;
}

function tryPush(x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = y * width + x;
  if (visited[i]) return;
  const o = i * channels;
  if (!isPureWhite(data[o], data[o + 1], data[o + 2])) return;
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

const temp = out + ".tmp.png";
await sharp(data, { raw: { width, height, channels } }).png().toFile(temp);
renameSync(temp, out);
console.log("dr maya 1.png background cleaned:", out);
