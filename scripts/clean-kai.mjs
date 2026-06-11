/**
 * Kai avatarındaki TÜM efektleri kaldır (parlama, noktalar, glow, yıldızlar)
 * Sadece ana karakter silueti kalsın
 */
import sharp from "sharp";
import { renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const assets =
  "C:\\Users\\İsmail\\.cursor\\projects\\c-Users-smail-kaify\\assets";

const src = `${assets}\\c__Users__smail_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Kai_level_1-57710425-b885-41b0-b4ac-d319f38638b6.png`;
const out = join(root, "public", "kai-mascot.png");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;

// Önce beyaz arka planı temizle
for (let i = 0; i < data.length; i += channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  const brightness = (r + g + b) / 3;
  const whiteness = Math.min(r, g, b);
  const colorSpread = Math.max(r, g, b) - Math.min(r, g, b);

  // Beyaz arka plan
  if (brightness > 238 && colorSpread < 28) {
    data[i + 3] = 0;
  } else if (brightness > 215 && whiteness > 205 && colorSpread < 40) {
    data[i + 3] = Math.round(255 * (1 - (brightness - 215) / 40));
  }
}

// İkinci geçiş: efektleri temizle
// Karakterin kendisi genelde yüksek opaklıkta ve doygun renklerde
// Efektler ise düşük opaklıkta, yüksek parlaklıkta veya mor/pembe tonlarında
for (let i = 0; i < data.length; i += channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];

  // Zaten şeffafsa atla
  if (a === 0) continue;

  const brightness = (r + g + b) / 3;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const spread = max - min;

  // 1. Yüksek parlaklıkta düşük doygunluk (glow/parlama)
  if (brightness > 190 && spread < 50 && a < 200) {
    data[i + 3] = 0;
    continue;
  }

  // 2. Mor/pembe tonlu düşük opaklıklı pikseller (efektler)
  const isPurpleTone = b > r * 0.5 && r > g && b > g;
  const isPinkTone = r > 150 && b > 100 && g < r * 0.7;
  if ((isPurpleTone || isPinkTone) && a < 180) {
    data[i + 3] = 0;
    continue;
  }

  // 3. Çok açık mor/pembe (sis efekti)
  if (brightness > 160 && (isPurpleTone || isPinkTone) && spread < 100) {
    data[i + 3] = 0;
    continue;
  }

  // 4. Karakterin dışındaki bağımsız küçük noktaları temizle
  // Düşük opaklık + yüksek parlaklık
  if (brightness > 150 && a < 120) {
    data[i + 3] = 0;
    continue;
  }
}

const temp = out + ".tmp.png";
await sharp(data, { raw: { width, height, channels } }).png().toFile(temp);
renameSync(temp, out);
console.log("Kai effects cleaned:", out);
