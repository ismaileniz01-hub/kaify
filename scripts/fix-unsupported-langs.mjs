/**
 * fix-unsupported-langs.mjs
 * 
 * Google Translate'in desteklemediği dillerdeki (es-ar, es-mx, he)
 * "UNSUPPORTED_LANG" değerlerini İspanyolca/İbranice çevirilerle değiştirir.
 * 
 * Kullanım: node scripts/fix-unsupported-langs.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LANG_DIR = path.resolve(__dirname, "../lib/lang");

// Referans diller
const esData = JSON.parse(fs.readFileSync(path.join(LANG_DIR, "es.json"), "utf-8"));
const heData = JSON.parse(fs.readFileSync(path.join(LANG_DIR, "he.json"), "utf-8"));

// es-ar: İspanyolca'dan kopyala
const esArPath = path.join(LANG_DIR, "es-ar.json");
const esArData = JSON.parse(fs.readFileSync(esArPath, "utf-8"));
let esArFixed = 0;
for (const key of Object.keys(esArData)) {
  if (esArData[key] === "UNSUPPORTED_LANG" && esData[key] !== undefined) {
    esArData[key] = esData[key];
    esArFixed++;
  }
}
fs.writeFileSync(esArPath, JSON.stringify(esArData, null, 2) + "\n", "utf-8");
console.log(`es-ar.json: ${esArFixed} "UNSUPPORTED_LANG" düzeltildi`);

// es-mx: İspanyolca'dan kopyala
const esMxPath = path.join(LANG_DIR, "es-mx.json");
const esMxData = JSON.parse(fs.readFileSync(esMxPath, "utf-8"));
let esMxFixed = 0;
for (const key of Object.keys(esMxData)) {
  if (esMxData[key] === "UNSUPPORTED_LANG" && esData[key] !== undefined) {
    esMxData[key] = esData[key];
    esMxFixed++;
  }
}
fs.writeFileSync(esMxPath, JSON.stringify(esMxData, null, 2) + "\n", "utf-8");
console.log(`es-mx.json: ${esMxFixed} "UNSUPPORTED_LANG" düzeltildi`);

// he: İbranice'den kopyala (he.json'da zaten çoğu çevrilmiş)
const hePath = path.join(LANG_DIR, "he.json");
const heDataCurrent = JSON.parse(fs.readFileSync(hePath, "utf-8"));
let heFixed = 0;
for (const key of Object.keys(heDataCurrent)) {
  if (heDataCurrent[key] === "UNSUPPORTED_LANG" && heData[key] !== undefined) {
    heDataCurrent[key] = heData[key];
    heFixed++;
  }
}
fs.writeFileSync(hePath, JSON.stringify(heDataCurrent, null, 2) + "\n", "utf-8");
console.log(`he.json: ${heFixed} "UNSUPPORTED_LANG" düzeltildi`);

console.log("\nTüm düzeltmeler tamamlandı!");
