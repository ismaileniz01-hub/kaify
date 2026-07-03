/**
 * Generates PWA / app icons from the brand logo.
 * Run: node scripts/generate-icons.mjs
 *
 * Outputs to public/icons/:
 *  - icon-192.png, icon-512.png           (transparent, full-bleed)
 *  - maskable-192.png, maskable-512.png   (safe-zone padded on theme bg)
 *  - apple-touch-icon.png (180)           (opaque theme bg — iOS has no alpha)
 *  - badge-72.png                         (small monochrome-ish push badge)
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = "public/kaify-logo.png";
const OUT = "public/icons";
const THEME_BG = { r: 10, g: 10, b: 10, alpha: 1 }; // #0a0a0a

async function transparent(size, file) {
  await sharp(SRC)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(OUT, file));
}

async function maskable(size, file) {
  const inner = Math.round(size * 0.78); // ~11% safe-zone padding each side
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: THEME_BG },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(OUT, file));
}

async function appleTouch(size, file) {
  const inner = Math.round(size * 0.86);
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: THEME_BG },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(OUT, file));
}

async function badge(size, file) {
  // Push badge: white silhouette of the logo on transparent bg (Android tints it).
  const inner = Math.round(size * 0.9);
  const white = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .toColourspace("b-w")
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: white, gravity: "center" }])
    .png()
    .toFile(path.join(OUT, file));
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await Promise.all([
    transparent(192, "icon-192.png"),
    transparent(512, "icon-512.png"),
    maskable(192, "maskable-192.png"),
    maskable(512, "maskable-512.png"),
    appleTouch(180, "apple-touch-icon.png"),
    badge(72, "badge-72.png"),
  ]);
  console.log("Icons generated in", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
