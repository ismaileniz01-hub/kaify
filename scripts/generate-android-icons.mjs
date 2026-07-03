/**
 * Generates Android launcher + notification icons from the K.AIFY logo.
 * Run: node scripts/generate-android-icons.mjs
 */
import sharp from "sharp";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";

const SRC = "public/kaify-logo.png";
const RES = "android/app/src/main/res";

const LAUNCHER_SIZES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

const SPLASH_SIZES = {
  "drawable-port-mdpi": 320,
  "drawable-port-hdpi": 480,
  "drawable-port-xhdpi": 720,
  "drawable-port-xxhdpi": 960,
  "drawable-port-xxxhdpi": 1280,
};

const THEME = { r: 10, g: 10, b: 10, alpha: 1 };

async function maskableIcon(size) {
  const inner = Math.round(size * 0.78);
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: THEME },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

async function splash(size) {
  const inner = Math.round(size * 0.35);
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size * 2, channels: 4, background: THEME },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

/** White silhouette for Android status-bar notification icon. */
async function notifStat(size) {
  return sharp(SRC)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .toColourspace("b-w")
    .negate()
    .png()
    .toBuffer();
}

async function main() {
  for (const [folder, size] of Object.entries(LAUNCHER_SIZES)) {
    const dir = path.join(RES, folder);
    await mkdir(dir, { recursive: true });
    const buf = await maskableIcon(size);
    await sharp(buf).toFile(path.join(dir, "ic_launcher.png"));
    await sharp(buf).toFile(path.join(dir, "ic_launcher_round.png"));
    await sharp(buf).toFile(path.join(dir, "ic_launcher_foreground.png"));
  }

  for (const [folder, size] of Object.entries(SPLASH_SIZES)) {
    const dir = path.join(RES, folder);
    await mkdir(dir, { recursive: true });
    const buf = await splash(size);
    await sharp(buf).toFile(path.join(dir, "splash.png"));
  }

  const splashDir = path.join(RES, "drawable");
  await mkdir(splashDir, { recursive: true });
  const defaultSplash = await splash(480);
  await sharp(defaultSplash).toFile(path.join(splashDir, "splash.png"));

  const stat = await notifStat(96);
  await sharp(stat).toFile(path.join(splashDir, "ic_stat_kaify.png"));

  console.log("Android icons + splash + ic_stat_kaify generated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
