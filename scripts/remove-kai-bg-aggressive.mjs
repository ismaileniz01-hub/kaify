import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const files = [
  { input: "kai level 2.png", output: "kai-level-2.png" },
  { input: "kai level 3.png", output: "kai-level-3.png" },
  { input: "kai level 4.png", output: "kai-level-4.png" },
];

/**
 * Flood-fill ile sadece dış kenarlardaki beyaz/gri arka planı temizle.
 * İç kısımdaki beyazları (göz gibi) koru.
 * Threshold 200 - daha agresif temizlik
 * Ayrıca renk farkı (diff) kontrolü ile Kai'nin kendi renklerini koru
 */
function floodFillRemoveBg(pixels, width, height, threshold = 200) {
  const visited = new Uint8Array(width * height);
  const queue = [];
  const result = Buffer.from(pixels);

  // Kenar piksellerini kuyruğa ekle
  for (let x = 0; x < width; x++) {
    queue.push(x, 0);
    queue.push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    queue.push(0, y);
    queue.push(width - 1, y);
  }

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

    // Beyaza yakın ve gri (renkler arası fark az) olan pikselleri temizle
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    if (max >= threshold && diff < 40) {
      visited[idx] = 1;
      result[pi + 3] = 0;

      // 4 yönlü komşuları ekle
      queue.push(x - 1, y);
      queue.push(x + 1, y);
      queue.push(x, y - 1);
      queue.push(x, y + 1);
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

  const result = floodFillRemoveBg(data, info.width, info.height, 200);

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
