import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const files = [
  { input: "Kai level 1.png", output: "kai-level-1.png" },
  { input: "kai level 2.png", output: "kai-level-2.png" },
  { input: "kai level 3.png", output: "kai-level-3.png" },
  { input: "kai level 4.png", output: "kai-level-4.png" },
];

/**
 * 8 yönlü flood-fill ile agresif arka plan temizliği.
 * Sadece dış kenarlardaki beyaz/gri pikselleri temizler.
 * İç kısımdaki beyaz alanlar (göz gibi) korunur.
 */
function floodFillRemoveBg(pixels, width, height, threshold = 160) {
  const visited = new Uint8Array(width * height);
  const queue = [];
  const result = Buffer.from(pixels);

  // Tüm kenar piksellerini kuyruğa ekle
  for (let x = 0; x < width; x++) {
    queue.push(x, 0);
    queue.push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    queue.push(0, y);
    queue.push(width - 1, y);
  }

  // 8 yönlü komşular
  const dirs = [-1, -1, -1, 0, -1, 1, 0, -1, 0, 1, 1, -1, 1, 0, 1, 1];

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx]) continue;

    const pi = idx * 4;
    const r = pixels[pi];
    const g = pixels[pi + 1];
    const b = pixels[pi + 2];

    // En yüksek kanal değeri threshold'un üstündeyse ve
    // renkler arası fark azsa (gri/beyaz) temizle
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    if (max >= threshold && diff < 60) {
      visited[idx] = 1;
      result[pi + 3] = 0;

      // 8 yönlü komşuları ekle
      for (let d = 0; d < dirs.length; d += 2) {
        queue.push(x + dirs[d], y + dirs[d + 1]);
      }
    }
  }

  // İkinci geçiş: kalan beyaz kalıntıları temizle (daha agresif)
  for (let i = 0; i < result.length; i += 4) {
    const r = result[i];
    const g = result[i + 1];
    const b = result[i + 2];
    const a = result[i + 3];

    if (a === 0) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    // Çok açık renkli ve düşük doygunluktaki pikselleri temizle
    if (max > 200 && diff < 40) {
      result[i + 3] = 0;
    }
  }

  return result;
}

async function removeBg(inputName, outputName) {
  const inputPath = path.join(root, "avatars", inputName);
  const outputPath = path.join(root, "public", "avatars", outputName);

  console.log(`\n📂 Processing: ${inputName}`);

  const image = sharp(inputPath);
  const { width, height } = await image.metadata();
  console.log(`   Size: ${width}x${height}`);

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const result = floodFillRemoveBg(data, info.width, info.height, 160);

  await sharp(result, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(outputPath);

  console.log(`   ✅ Saved: ${outputName}`);
}

async function main() {
  for (const f of files) {
    await removeBg(f.input, f.output);
  }
  console.log("\n✅ All done!");
}

main().catch(console.error);
