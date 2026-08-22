/**
 * Crops transparent / leftover black padding outside the brand mark,
 * then writes a square 1024 master to public/kaify-logo.png.
 *
 * Usage: node scripts/process-brand-logo.mjs [source.png]
 */
import sharp from "sharp";
import path from "node:path";

const SRC =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE || "",
    ".cursor/projects/c-Users-ismai-OneDrive-Masa-st-kaify-kaify-main/assets/c__Users_ismai_AppData_Roaming_Cursor_User_workspaceStorage_09c373ad392a92a78e3e67185510521f_images_kaify-logo-filled-52c3e6cc-f84f-4d08-b460-5c8eb0f9f8c5.png",
  );
const OUT = "public/kaify-logo.png";
const MASTER = 1024;

function isOutside(r, g, b, a) {
  if (a < 12) return true;
  return r < 22 && g < 22 && b < 22;
}

function floodClearEdge(data, width, height, channels) {
  const seen = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx]) return;
    const i = idx * channels;
    if (!isOutside(data[i], data[i + 1], data[i + 2], data[i + 3])) return;
    seen[idx] = 1;
    stack.push(idx);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (stack.length) {
    const idx = stack.pop();
    const x = idx % width;
    const y = (idx / width) | 0;
    data[idx * channels + 3] = 0;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }
}

function contentBox(data, width, height, channels) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] < 10) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({
  resolveWithObject: true,
});
const { width, height, channels } = info;
floodClearEdge(data, width, height, channels);

const box = contentBox(data, width, height, channels);
const bw = box.maxX - box.minX + 1;
const bh = box.maxY - box.minY + 1;
const side = Math.max(bw, bh);
const padX = Math.floor((side - bw) / 2);
const padY = Math.floor((side - bh) / 2);

const cropped = await sharp(data, { raw: { width, height, channels } })
  .extract({ left: box.minX, top: box.minY, width: bw, height: bh })
  .extend({
    top: padY,
    bottom: side - bh - padY,
    left: padX,
    right: side - bw - padX,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

await sharp(cropped)
  .resize(MASTER, MASTER, {
    fit: "fill",
    kernel: "lanczos3",
  })
  .png()
  .toFile(OUT);

console.log(
  `Wrote ${OUT} from ${width}x${height} crop ${bw}x${bh} → square ${side} → ${MASTER}`,
);
