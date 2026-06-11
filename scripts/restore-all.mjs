/**
 * Tüm avatarları orijinal kaynaklardan yeniden oluştur (sadece beyaz arka plan temizliği)
 */
import sharp from "sharp";
import { renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const assets =
  "C:\\Users\\İsmail\\.cursor\\projects\\c-Users-smail-kaify\\assets";

const jobs = [
  {
    src: `${assets}\\c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_alex_avatar-c306aac1-be47-49f3-9a30-5553aa6975ce.png`,
    out: join(root, "public", "avatars", "alex.png"),
  },
  {
    src: `${assets}\\c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Dr.maya_avatar-6d54836f-0747-4611-8c19-0223441baf8f.png`,
    out: join(root, "public", "avatars", "maya.png"),
  },
  {
    src: `${assets}\\c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Leo_avatar-bad4cb37-57ba-44d2-8a58-5c9ddfbe1814.png`,
    out: join(root, "public", "avatars", "leo.png"),
  },
  {
    src: `${assets}\\c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Kai_level_1-57710425-b885-41b0-b4ac-d319f38638b6.png`,
    out: join(root, "public", "kai-mascot.png"),
  },
];

for (const job of jobs) {
  const { data, info } = await sharp(job.src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // Sadece beyaz arka plan temizliği
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const brightness = (r + g + b) / 3;
    const whiteness = Math.min(r, g, b);
    const colorSpread = Math.max(r, g, b) - Math.min(r, g, b);

    if (brightness > 238 && colorSpread < 28) {
      data[i + 3] = 0;
    } else if (brightness > 215 && whiteness > 205 && colorSpread < 40) {
      data[i + 3] = Math.round(255 * (1 - (brightness - 215) / 40));
    }
  }

  const temp = job.out + ".tmp.png";
  await sharp(data, { raw: { width, height, channels } }).png().toFile(temp);
  renameSync(temp, job.out);
  console.log("Restored:", job.out);
}

console.log("All avatars restored to original!");
