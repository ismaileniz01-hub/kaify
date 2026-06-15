import sharp from "sharp";
import fs from "fs";

const FILES = [
  {
    name: "Kai Level 1",
    input: "C:/Users/İsmail/OneDrive/Masaüstü/avatars/Kai level 1.png",
    output: "c:/Users/İsmail/kaify/public/avatars/kai-level-1.png",
    backup: "c:/Users/İsmail/kaify/public/avatars/kai-level-1.png.original",
  },
  {
    name: "Kai Level 2",
    input: "C:/Users/İsmail/OneDrive/Masaüstü/avatars/kai level 2.png",
    output: "c:/Users/İsmail/kaify/public/avatars/kai-level-2.png",
    backup: "c:/Users/İsmail/kaify/public/avatars/kai-level-2.png.original",
  },
  {
    name: "Leo 1",
    input: "C:/Users/İsmail/OneDrive/Masaüstü/avatars/leo 1.png",
    output: "c:/Users/İsmail/kaify/public/avatars/leo-1.png",
    backup: "c:/Users/İsmail/kaify/public/avatars/leo-1.png.original",
  },
  {
    name: "Leo 2",
    input: "C:/Users/İsmail/OneDrive/Masaüstü/avatars/leo 2.png",
    output: "c:/Users/İsmail/kaify/public/avatars/leo-2.png",
    backup: "c:/Users/İsmail/kaify/public/avatars/leo-2.png.original",
  },
];

async function removeGreenBg(file) {
  console.log(`\n📂 Processing ${file.name}...`);
  console.log(`   Input: ${file.input}`);

  const image = sharp(file.input);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  console.log(`   Size: ${w}x${h}`);

  // Köşelerdeki rengi bul
  const corners = [
    { x: 0, y: 0 },
    { x: w - 1, y: 0 },
    { x: 0, y: h - 1 },
    { x: w - 1, y: h - 1 },
  ];

  let totalR = 0, totalG = 0, totalB = 0;
  for (const c of corners) {
    const idx = (c.y * w + c.x) * info.channels;
    totalR += data[idx];
    totalG += data[idx + 1];
    totalB += data[idx + 2];
  }

  const avgR = totalR / corners.length;
  const avgG = totalG / corners.length;
  const avgB = totalB / corners.length;
  console.log(`   Background: R=${avgR.toFixed(0)} G=${avgG.toFixed(0)} B=${avgB.toFixed(0)}`);

  // Yeşil arka planı temizle
  const pixels = Buffer.alloc(w * h * 4);
  let removed = 0;

  const TOLERANCE = 50;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * info.channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = info.channels === 4 ? data[idx + 3] : 255;

      const outIdx = (y * w + x) * 4;

      const dist = Math.sqrt(
        (r - avgR) ** 2 + (g - avgG) ** 2 + (b - avgB) ** 2
      );

      const isGreenish = g > r * 1.1 && g > b * 1.1;

      if (dist < TOLERANCE && isGreenish) {
        pixels[outIdx] = 0;
        pixels[outIdx + 1] = 0;
        pixels[outIdx + 2] = 0;
        pixels[outIdx + 3] = 0;
        removed++;
      } else {
        pixels[outIdx] = r;
        pixels[outIdx + 1] = g;
        pixels[outIdx + 2] = b;
        pixels[outIdx + 3] = a;
      }
    }
  }

  const pct = ((removed / (w * h)) * 100).toFixed(1);
  console.log(`   Removed: ${removed} pixels (${pct}%)`);

  // Yedek al (varsa)
  if (fs.existsSync(file.output)) {
    fs.copyFileSync(file.output, file.backup);
    console.log("   Backup saved");
  }

  // Kaydet
  await sharp(pixels, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(file.output);

  console.log(`   ✅ Saved to: ${file.output}`);
}

async function main() {
  for (const file of FILES) {
    await removeGreenBg(file);
  }
  console.log("\n🎉 All done!");
}

main().catch(console.error);
