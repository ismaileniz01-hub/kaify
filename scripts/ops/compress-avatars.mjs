/**
 * Faz 1: compress public/avatars — delete .bak, write WebP (max 512px), shrink PNG sources.
 * Usage: node scripts/ops/compress-avatars.mjs
 */
import { readdirSync, unlinkSync, statSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";
import sharp from "sharp";

const DIR = join(process.cwd(), "public", "avatars");
const MAX_EDGE = 512;
const WEBP_QUALITY = 78;

async function main() {
  const files = readdirSync(DIR);
  let deletedBak = 0;
  let wroteWebp = 0;
  let shrunkPng = 0;

  for (const name of files) {
    const full = join(DIR, name);
    if (!statSync(full).isFile()) continue;

    if (name.endsWith(".bak") || name.endsWith(".tmp")) {
      unlinkSync(full);
      deletedBak += 1;
      console.log(`deleted ${name}`);
      continue;
    }

    if (extname(name).toLowerCase() !== ".png") continue;

    const meta = await sharp(full).rotate().metadata();
    const w = meta.width ?? MAX_EDGE;
    const h = meta.height ?? MAX_EDGE;
    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const resized = sharp(full).rotate().resize(tw, th, { fit: "inside" });

    const webpName = `${basename(name, ".png")}.webp`;
    const webpPath = join(DIR, webpName);
    const webpBuf = await resized.clone().webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer();
    writeFileSync(webpPath, webpBuf);
    wroteWebp += 1;

    const before = statSync(full).size;
    const pngBuf = await resized
      .clone()
      .png({ compressionLevel: 9, palette: true, quality: 80 })
      .toBuffer();
    if (pngBuf.length < before) {
      const tmp = `${full}.tmp`;
      writeFileSync(tmp, pngBuf);
      try {
        if (existsSync(full)) unlinkSync(full);
        renameSync(tmp, full);
      } catch {
        writeFileSync(full, pngBuf);
        try {
          unlinkSync(tmp);
        } catch {
          /* ignore */
        }
      }
      shrunkPng += 1;
      console.log(
        `png ${name}: ${(before / 1024).toFixed(0)}KB → ${(pngBuf.length / 1024).toFixed(0)}KB + ${webpName}`,
      );
    } else {
      console.log(`png ${name}: kept (${(before / 1024).toFixed(0)}KB) + ${webpName}`);
    }
  }

  console.log(
    `\nDone. bak deleted=${deletedBak} webp=${wroteWebp} png_shrunk=${shrunkPng}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
