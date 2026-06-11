/**
 * alex-typing.png'i assets'teki diğer ChatGPT görselinden oluştur
 */
import sharp from "sharp";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const assets =
  "C:\\Users\\İsmail\\.cursor\\projects\\c-Users-smail-kaify\\assets";

// Diğer ChatGPT görselini dene
const srcPath = join(
  assets,
  "c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_ChatGPT_Image_5_Haz_2026_14_18_33-c0c4f4a5-a2f9-47b5-8fb2-f54bc79bba7a.png"
);

const outputPath = join(root, "public", "avatars", "alex-typing.png");

await sharp(srcPath)
  .resize(512, 512)
  .png()
  .toFile(outputPath);

console.log("Reset alex-typing.png from v2:", outputPath);
