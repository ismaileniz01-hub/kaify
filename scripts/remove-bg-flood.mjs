/**
 * Sadece görüntü kenarına bağlı beyaz arka planı kaldırır.
 * Karakter üzerindeki beyazlar (gömlek yazısı, önlük, göz parlaması vb.) korunur.
 */
import sharp from "sharp";
import { renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const THRESHOLD = 248; // saf arka plan beyazı
const SOFT_THRESHOLD = 235; // kenar yumuşatma

function isBgPixel(r, g, b) {
  return r >= THRESHOLD && g >= THRESHOLD && b >= THRESHOLD;
}

function isSoftBgPixel(r, g, b) {
  const brightness = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return brightness >= SOFT_THRESHOLD && spread < 20;
}

function floodRemoveBackground(data, width, height, channels) {
  const size = width * height;
  const visited = new Uint8Array(size);
  const queue = [];

  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    const o = i * channels;
    if (!isBgPixel(data[o], data[o + 1], data[o + 2])) return;
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

  // Kenar anti-alias: arka plana komşu yarı-beyaz pikselleri yumuşat
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const o = i * channels;
      if (data[o + 3] === 0) continue;

      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      if (!isSoftBgPixel(r, g, b)) continue;

      let touchesBg = false;
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (data[(ny * width + nx) * channels + 3] === 0) {
          touchesBg = true;
          break;
        }
      }
      if (touchesBg) {
        const brightness = (r + g + b) / 3;
        const alpha = Math.round(((brightness - SOFT_THRESHOLD) / (255 - SOFT_THRESHOLD)) * 255);
        data[o + 3] = Math.min(data[o + 3], Math.max(0, alpha));
      }
    }
  }
}

async function processFile(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buffer = Buffer.from(data);
  floodRemoveBackground(buffer, info.width, info.height, info.channels);

  const temp = outputPath + ".tmp.png";
  await sharp(buffer, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toFile(temp);

  renameSync(temp, outputPath);
  console.log("OK:", outputPath);
}

const assets =
  "C:\\Users\\İsmail\\.cursor\\projects\\c-Users-smail-kaify\\assets";

const jobs = [
  {
    src: `${assets}\\c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_alex_avatar-c306aac1-be47-49f3-9a30-5553aa6975ce.png`,
    out: join(root, "public", "avatars", "alex.png"),
  },
  {
    src: `${assets}\\c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Dr.maya_avatar-6d54836f-0747-4611-8c19-0223441baf8f.png`,
    out: join(root, "public", "avatars", "maya.png"),
  },
  {
    src: `${assets}\\c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Leo_avatar-bad4cb37-57ba-44d2-8a58-5c9ddfbe1814.png`,
    out: join(root, "public", "avatars", "leo.png"),
  },
  {
    src: `${assets}\\c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Kai_level_1-57710425-b885-41b0-b4ac-d319f38638b6.png`,
    out: join(root, "public", "kai-mascot.png"),
  },
];

for (const job of jobs) {
  await processFile(job.src, job.out);
}
