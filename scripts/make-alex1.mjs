/**
 * alex 1.png'i assets'teki orijinal ChatGPT görselinden oluştur
 */
import sharp from "sharp";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const assets =
  "C:\\Users\\İsmail\\.cursor\\projects\\c-Users-smail-kaify\\assets";

const srcPath = join(
  assets,
  "c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_ChatGPT_Image_5_Haz_2026_14_18_33-149e78e6-e19f-4482-8050-7774c610d240.png"
);

const outputPath = join(root, "public", "avatars", "alex 1.png");

await sharp(srcPath)
  .resize(512, 512)
  .png()
  .toFile(outputPath);

console.log("Created alex 1.png:", outputPath);
