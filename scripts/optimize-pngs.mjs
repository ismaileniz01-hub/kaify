/**
 * Optimize large PNG files in public/ for Vercel deployment.
 * Run: node scripts/optimize-pngs.mjs
 *
 * Compresses PNGs > 300KB using sharp (already in dependencies).
 */

import { readdirSync, statSync, renameSync, existsSync } from "fs";
import { join, extname, dirname } from "path";
import sharp from "sharp";

const DIRS = ["public", "public/avatars"];
const MAX_SIZE = 300 * 1024; // 300 KB threshold
const QUALITY = 75; // JPEG quality if converting, PNG compression level

async function optimizeFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext !== ".png") return;

  const stats = statSync(filePath);
  if (stats.size < MAX_SIZE) return;

  const originalSize = stats.size;
  const backupPath = filePath + ".original";

  // Skip if already has a backup (already optimized)
  if (existsSync(backupPath)) {
    console.log(`  ⏭ Already optimized: ${filePath}`);
    return;
  }

  console.log(`  🔧 Optimizing: ${filePath} (${(originalSize / 1024).toFixed(0)} KB)`);

  try {
    // Rename original to .original
    renameSync(filePath, backupPath);

    // Compress with sharp
    await sharp(backupPath)
      .png({ compressionLevel: 9, palette: true })
      .toFile(filePath);

    const newSize = statSync(filePath).size;
    const saved = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    console.log(`    ✅ Saved ${(originalSize / 1024).toFixed(0)} KB → ${(newSize / 1024).toFixed(0)} KB (${saved}% reduction)`);
  } catch (err) {
    // Restore backup on failure
    if (existsSync(backupPath) && !existsSync(filePath)) {
      renameSync(backupPath, filePath);
    }
    console.error(`    ❌ Error: ${err.message}`);
  }
}

async function main() {
  console.log("🔍 Scanning for large PNG files...\n");

  for (const dir of DIRS) {
    const fullPath = join(process.cwd(), dir);
    if (!existsSync(fullPath)) {
      console.log(`  📁 Skipping (not found): ${dir}`);
      continue;
    }

    const files = readdirSync(fullPath);
    const pngFiles = files.filter((f) => extname(f).toLowerCase() === ".png");

    if (pngFiles.length === 0) {
      console.log(`  📁 No PNGs in: ${dir}`);
      continue;
    }

    console.log(`  📁 ${dir} (${pngFiles.length} PNGs)`);

    for (const file of pngFiles) {
      await optimizeFile(join(fullPath, file));
    }
  }

  console.log("\n✅ Optimization complete!");
}

main().catch(console.error);
