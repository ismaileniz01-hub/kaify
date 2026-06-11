/**
 * dr maya 1.png - gömlek bölgesindeki beyaz renkleri analiz et
 */
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function analyze() {
  const inputPath = join(root, "public", "avatars", "dr maya 1.png");
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const buffer = Buffer.from(data);

  // Gömlek bölgesi: alt-orta kısım
  const shirtY1 = Math.floor(height * 0.5);
  const shirtY2 = Math.floor(height * 0.8);
  const shirtX1 = Math.floor(width * 0.3);
  const shirtX2 = Math.floor(width * 0.7);

  let whiteCount = 0;
  let blueInShirt = 0;
  let totalShirt = 0;

  console.log("Gömlek bölgesindeki beyaz ve mavi tonlar:");
  for (let y = shirtY1; y < shirtY2; y++) {
    for (let x = shirtX1; x < shirtX2; x++) {
      const i = (y * width + x) * channels;
      const r = buffer[i], g = buffer[i+1], b = buffer[i+2], a = buffer[i+3];
      totalShirt++;
      
      // Beyaz ton (R>200, G>200, B>200)
      if (r > 200 && g > 200 && b > 200) {
        whiteCount++;
        if (whiteCount <= 5) {
          console.log(`  Beyaz: (${x},${y}) R=${r} G=${g} B=${b} A=${a}`);
        }
      }
      
      // Mavi ton (B > R && B > G)
      if (b > r && b > g) {
        blueInShirt++;
        if (blueInShirt <= 5) {
          console.log(`  Mavi: (${x},${y}) R=${r} G=${g} B=${b} A=${a}`);
        }
      }
    }
  }
  console.log(`\nGömlek bölgesi toplam: ${totalShirt} piksel`);
  console.log(`Beyaz (R>200,G>200,B>200): ${whiteCount} (${(whiteCount/totalShirt*100).toFixed(1)}%)`);
  console.log(`Mavi (B>R && B>G): ${blueInShirt} (${(blueInShirt/totalShirt*100).toFixed(1)}%)`);

  // Şeffaf pikselleri say
  let transparent = 0;
  for (let i = 3; i < buffer.length; i += channels) {
    if (buffer[i] === 0) transparent++;
  }
  console.log(`\nToplam şeffaf piksel: ${transparent} / ${width * height}`);
}

analyze().catch(console.error);
