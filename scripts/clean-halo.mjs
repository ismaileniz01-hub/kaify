/**
 * Removes the leftover white HALO around an already-transparent mascot PNG.
 *
 * The source has hard edges (no anti-alias) and a ring of opaque white/gray
 * pixels between the dark outline and the transparent background. We erode only
 * whitish, low-saturation pixels that touch transparency, iterating until the
 * ring is gone. Interior whites (eye highlights) are enclosed by the dark
 * outline, so they are never adjacent to transparency and stay intact. Finally
 * we add a 1px alpha feather so the edge looks smooth on any background.
 *
 * Usage: node scripts/clean-halo.mjs <input> <output>
 */
import sharp from "sharp";

const SRC = process.argv[2];
const OUT = process.argv[3];
if (!SRC || !OUT) {
  console.error("usage: node scripts/clean-halo.mjs <input> <output>");
  process.exit(1);
}

const WHITE_MIN = 200; // min(R,G,B) >= this = bright
const SAT_MAX = 40; // max-min <= this = gray/white
const MAX_PASSES = 24;

async function main() {
  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const N = width * height;

  const transparent = new Uint8Array(N);
  for (let f = 0; f < N; f += 1) transparent[f] = data[f * 4 + 3] === 0 ? 1 : 0;

  const isWhitish = (i) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const mn = Math.min(r, g, b);
    const mx = Math.max(r, g, b);
    return mn >= WHITE_MIN && mx - mn <= SAT_MAX;
  };
  const hasTransparentNeighbor = (x, y) => {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (transparent[ny * width + nx]) return true;
      }
    }
    return false;
  };

  let totalCleared = 0;
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const toClear = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const flat = y * width + x;
        if (transparent[flat]) continue;
        const i = flat * 4;
        if (data[i + 3] === 0) continue;
        if (!isWhitish(i)) continue;
        if (hasTransparentNeighbor(x, y)) toClear.push(flat);
      }
    }
    if (toClear.length === 0) break;
    for (const flat of toClear) {
      transparent[flat] = 1;
      data[flat * 4 + 3] = 0;
    }
    totalCleared += toClear.length;
  }

  // 1px alpha feather: soften remaining edge pixels adjacent to transparency.
  const alphaCopy = new Uint8Array(N);
  for (let f = 0; f < N; f += 1) alphaCopy[f] = data[f * 4 + 3];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const flat = y * width + x;
      if (alphaCopy[flat] === 0) continue;
      let transCount = 0;
      let total = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          total += 1;
          if (transparent[ny * width + nx]) transCount += 1;
        }
      }
      if (transCount > 0) {
        const keep = 1 - (transCount / total) * 0.6;
        data[flat * 4 + 3] = Math.round(alphaCopy[flat] * keep);
      }
    }
  }

  await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(OUT);
  console.log(`halo cleared ${totalCleared}px -> ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
