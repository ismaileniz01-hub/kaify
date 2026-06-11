/**
 * dr maya 1.png'deki bozuk beyaz gömleği dr maya 2.png'den onarır.
 * dr maya 1'de şeffaf olan ama dr maya 2'de opak olan pikselleri kopyalar.
 */
import sharp from "sharp";
import { renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function main() {
  const path1 = join(root, "public", "avatars", "dr maya 1.png");
  const path2 = join(root, "public", "avatars", "dr maya 2.png");

  const [buf1, buf2] = await Promise.all([
    sharp(path1).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(path2).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  ]);

  const { data: data1, info: info1 } = buf1;
  const { data: data2, info: info2 } = buf2;
  const { width, height, channels } = info1;

  if (width !== info2.width || height !== info2.height) {
    console.error("Boyutlar uyuşmuyor!");
    return;
  }

  const buffer = Buffer.from(data1);
  let fixed = 0;

  for (let i = 0; i < buffer.length; i += channels) {
    const a1 = buffer[i + 3];
    const a2 = data2[i + 3];
    const r2 = data2[i], g2 = data2[i+1], b2 = data2[i+2];

    // dr maya 1'de şeffaf ama dr maya 2'de opak olan pikseller
    // ve dr maya 2'deki renk beyaz ton (gömlek)
    if (a1 === 0 && a2 > 0 && r2 > 150 && g2 > 150 && b2 > 150) {
      buffer[i] = r2;
      buffer[i+1] = g2;
      buffer[i+2] = b2;
      buffer[i+3] = 255;
      fixed++;
    }
  }

  console.log(`Onarılan beyaz piksel: ${fixed}`);

  const temp = path1 + ".tmp.png";
  await sharp(buffer, { raw: { width, height, channels } })
    .png()
    .toFile(temp);

  renameSync(temp, path1);
  console.log("OK");
}

main().catch(console.error);
