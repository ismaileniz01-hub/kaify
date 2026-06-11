/**
 * alex-typing.png'deki yeşil arka planı beyaza çevir (şeffaf değil)
 * Gözler, dişler gibi detaylar korunur
 */
import sharp from "sharp";
import { renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Orijinal kaynak - ChatGPT görseli
const assets =
  "C:\\Users\\İsmail\\.cursor\\projects\\c-Users-smail-kaify\\assets";

const srcPath = join(
  assets,
  "c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_ChatGPT_Image_5_Haz_2026_14_18_33-149e78e6-e19f-4482-8050-7774c610d240.png"
);

const outputPath = join(root, "public", "avatars", "alex-typing.png");

const { data, info } = await sharp(srcPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;

// Yeşil arka planı beyaza çevir
for (let i = 0; i < data.length; i += channels) {
  const r = data[i], g = data[i+1], b = data[i+2];

  // Yeşil piksel tespiti: G baskın, R ve B düşük
  if (g > r * 1.2 && g > b * 1.2 && g > 60) {
    // Yeşil -> beyaz
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  } else {
    // Diğer renkler (Alex'in kendisi) -> tam opak
    data[i + 3] = 255;
  }
}

const temp = outputPath + ".tmp.png";
await sharp(data, { raw: { width, height, channels } })
  .resize(512, 512)
  .png()
  .toFile(temp);

renameSync(temp, outputPath);
console.log("Fixed:", outputPath);
