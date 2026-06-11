import sharp from "sharp";
import { renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const files = [
  {
    src: "C:\\Users\\İsmail\\.cursor\\projects\\c-Users-smail-kaify\\assets\\c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_alex_avatar-87ac820e-da81-435e-98c5-53ebadcabd9a.png",
    out: join(root, "public", "avatars", "alex.png"),
  },
  {
    src: "C:\\Users\\İsmail\\.cursor\\projects\\c-Users-smail-kaify\\assets\\c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Dr.maya_avatar-a1bf3bf2-5fc8-449b-9633-547c75a0a90d.png",
    out: join(root, "public", "avatars", "maya.png"),
  },
  {
    src: "C:\\Users\\İsmail\\.cursor\\projects\\c-Users-smail-kaify\\assets\\c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Leo_avatar-051e4181-880d-4596-8619-dba6dbf3944a.png",
    out: join(root, "public", "avatars", "leo.png"),
  },
];

async function removeWhite(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

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

  const temp = outputPath + ".tmp.png";
  await sharp(data, { raw: { width, height, channels } }).png().toFile(temp);
  renameSync(temp, outputPath);
  console.log("Wrote", outputPath);
}

for (const f of files) {
  await removeWhite(f.src, f.out);
}
