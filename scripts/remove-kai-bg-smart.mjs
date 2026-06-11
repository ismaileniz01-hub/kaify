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
 * Flood-fill ile sadece dış kenarlardaki beyazları temizle.
 * İç kısımdaki beyazları (göz gibi) koru.
 */
function floodFillRemoveBg(pixels, width, height, threshold = 240) {
  const visited = new Uint8Array(width * height);
  const queue = [];
  const result = Buffer.from(pixels);

  // Kenar piksellerini kuyruğa ekle
  for (let x = 0; x < width; x++) {
    queue.push(x, 0); // üst kenar
    queue.push(x, height - 1); // alt kenar
  }
  for (let y = 0; y < height; y++) {
    queue.push(0, y); // sol kenar
    queue.push(width - 1, y); // sağ kenar
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

    // Sadece beyaza yakın pikselleri işle
    if (r >= threshold && g >= threshold && b >= threshold) {
      visited[idx] = 1;
      result[pi + 3] = 0; // saydam yap

      // Komşuları ekle
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

  console.log(`   Channels: ${info.channels}`);

  // Flood-fill ile temizle - sadece kenarlardaki beyazları
  const result = floodFillRemoveBg(data, info.width, info.height, 240);

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
