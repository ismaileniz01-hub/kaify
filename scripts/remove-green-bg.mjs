/**
 * Chroma-key green screen removal for Kai level assets.
 */
import sharp from "sharp";
import { copyFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");

function isGreen(r, g, b, a) {
  if (a < 10) return true;
  const dominance = g - Math.max(r, b);
  return g > 100 && dominance > 40 && g > r * 1.15 && g > b * 1.15;
}

function isSoftGreen(r, g, b, a) {
  if (a < 10) return true;
  const dominance = g - Math.max(r, b);
  return g > 80 && dominance > 25;
}

async function removeGreen(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const size = width * height;
  const visited = new Uint8Array(size);
  const queue = [];

  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    const o = i * channels;
    if (!isGreen(data[o], data[o + 1], data[o + 2], data[o + 3])) return;
    visited[i] = 1;
    queue.push(i);
  };

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
    data[o + 3] = 0;

    const x = i % width;
    const y = (i - x) / width;
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = i * channels;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];

      if (isGreen(r, g, b, data[o + 3]) || isSoftGreen(r, g, b, data[o + 3])) {
        data[o + 3] = 0;
        continue;
      }

      if (data[o + 3] === 0) continue;

      if (isSoftGreen(r, g, b, data[o + 3])) {
        let touchesBg = false;
        for (const [nx, ny] of [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ]) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (visited[ny * width + nx] || data[(ny * width + nx) * channels + 3] === 0) {
            touchesBg = true;
            break;
          }
        }
        if (touchesBg) {
          data[o + 3] = 0;
        }
      }
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath);

  console.log(`OK: ${outputPath}`);
}

const sources = [
  {
    src: "C:\\Users\\İsmail\\.cursor\\projects\\c-Users-smail-kaify\\assets\\c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Kai_level_1-cc6476ea-2ada-49df-82fb-f20cc4de559c.png",
    out: join(publicDir, "kai-level-1.png"),
  },
  {
    src: "C:\\Users\\İsmail\\.cursor\\projects\\c-Users-smail-kaify\\assets\\c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_kai_level_2-7d3e1360-595d-4d57-862b-fec8ab742293.png",
    out: join(publicDir, "kai-level-2.png"),
  },
];

mkdirSync(publicDir, { recursive: true });

for (const { src, out } of sources) {
  await removeGreen(src, out);
}
