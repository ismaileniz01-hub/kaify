/**
 * One-shot asset processor: removes green-screen background from the Kai chest PNG.
 * Usage: node scripts/chroma-key-chest.mjs [input.png] [output.png]
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const input =
  process.argv[2] ??
  resolve(
    "assets/c__Users_ismai_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Gemini_Generated_Image_c9s7zzc9s7zzc9s7-51446dee-36f5-4683-a673-f3a8bdfc9690.png",
  );
const output = process.argv[3] ?? resolve("public/assets/kai-chest.png");

function chromaKeyGreen(data, width, height) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const maxRB = Math.max(r, b);
      const greenExcess = g - maxRB;

      // Aggressive green-screen removal with soft edge feathering.
      if (g > 60 && greenExcess > 18) {
        const spill = Math.min(255, greenExcess * 5);
        const alpha = Math.max(0, 255 - spill);
        data[i + 3] = Math.min(data[i + 3], alpha);
        // Despill: reduce green tint on semi-transparent edge pixels.
        if (alpha < 240) {
          data[i + 1] = Math.min(g, Math.max(r, b));
        }
      }

      // Kill pure floor shadow on green backdrop.
      if (g > 100 && r < 90 && b < 90 && greenExcess > 40) {
        data[i + 3] = 0;
      }
    }
  }
}

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

chromaKeyGreen(data, info.width, info.height);

await mkdir(dirname(output), { recursive: true });
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(`Chroma-keyed chest saved → ${output} (${info.width}x${info.height})`);
