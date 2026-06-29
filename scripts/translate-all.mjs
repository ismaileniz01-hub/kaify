/**
 * translate-all.mjs
 * 
 * Bu script, en.json'daki tüm anahtarları alıp mevcut dil dosyalarındaki
 * çevirileri koruyarak, eksik anahtarları Google Translate ile çevirir.
 * 
 * Kullanım: node scripts/translate-all.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import translate from "translate-google";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LANG_DIR = path.resolve(__dirname, "../lib/lang");

// en.json'u oku (referans)
const enPath = path.join(LANG_DIR, "en.json");
const enData = JSON.parse(fs.readFileSync(enPath, "utf-8"));

// Mevcut dil dosyasını oku
function readLang(lang) {
  try {
    const p = path.join(LANG_DIR, `${lang}.json`);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  } catch (e) {
    console.error(`Error reading ${lang}.json:`, e.message);
  }
  return {};
}

// Dil dosyasını yaz
function writeLang(lang, data) {
  const p = path.join(LANG_DIR, `${lang}.json`);
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// Google Translate ile çeviri yap
async function translateText(text, targetLang) {
  // Değişken tutucuları ({name}, {level}, {day}, {percent}, {value}) koru
  const placeholders = text.match(/\{[a-zA-Z_]+\}/g) || [];
  let tempText = text;
  const tokenMap = {};
  
  placeholders.forEach((ph, i) => {
    const token = `__PH${i}__`;
    tokenMap[token] = ph;
    tempText = tempText.replace(ph, token);
  });

  try {
    const translated = await translate(tempText, { to: targetLang });
    let result = translated;
    
    // Token'ları geri yerleştir
    for (const [token, original] of Object.entries(tokenMap)) {
      result = result.replace(token, original);
    }
    
    return result;
  } catch (e) {
    console.error(`  ✗ Çeviri hatası (${targetLang}): "${text.substring(0, 30)}..." - ${e.message}`);
    return null;
  }
}

// Küçük gecikme ile bekle (rate limiting'i önlemek için)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Sadece İngilizce olan metinleri bul (en.json'daki değerle aynı olanlar)
function findEnglishOnlyKeys(existing, lang) {
  const keys = [];
  for (const key of Object.keys(enData)) {
    const enValue = enData[key];
    const existingValue = existing[key];
    
    // Eğer anahtar yoksa veya değer İngilizce ile aynıysa (çevrilmemiş demektir)
    if (existingValue === undefined || existingValue === enValue) {
      if (lang === 'en') continue;
      keys.push(key);
    }
  }
  return keys;
}

// Tüm dilleri işle
async function main() {
  const languages = fs.readdirSync(LANG_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .filter(code => code !== 'en'); // en.json referans olduğu için atla

  console.log("=== Dil dosyaları Google Translate ile çevriliyor ===\n");

  let totalTranslated = 0;
  let totalErrors = 0;

  for (const lang of languages) {
    const existing = readLang(lang);
    const keysToTranslate = findEnglishOnlyKeys(existing, lang);
    
    if (keysToTranslate.length === 0) {
      console.log(`  → ${lang}: Tüm anahtarlar zaten çevrilmiş`);
      continue;
    }

    console.log(`  → ${lang}: ${keysToTranslate.length} anahtar çevriliyor...`);
    
    let translatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < keysToTranslate.length; i++) {
      const key = keysToTranslate[i];
      const enValue = enData[key];
      
      // Boş veya geçersiz değerleri atla
      if (!enValue || typeof enValue !== 'string' || enValue.trim() === '') {
        existing[key] = enValue;
        continue;
      }

      // Sadece sembol/emoji/rakam içerenleri atla
      if (/^[\d\s.,%\-—–/\\|#*•°²³¹⁰⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉💎🎉✅❌⚠️🔥⭐✨💪🏆🥇🥈🥉]+$/.test(enValue.replace(/\{[a-zA-Z_]+\}/g, '').trim())) {
        existing[key] = enValue;
        continue;
      }

      try {
        const translated = await translateText(enValue, lang);
        if (translated) {
          existing[key] = translated;
          translatedCount++;
          totalTranslated++;
        } else {
          existing[key] = enValue; // fallback
          errorCount++;
          totalErrors++;
        }
      } catch (e) {
        existing[key] = enValue; // fallback
        errorCount++;
        totalErrors++;
      }

      // Rate limiting - her 3 çeviride 1 saniye bekle
      if (i % 3 === 2) {
        await delay(1000);
      } else {
        await delay(500);
      }
    }

    writeLang(lang, existing);
    console.log(`  ✓ ${lang}: ${translatedCount} çevrildi, ${errorCount} hata (${Object.keys(existing).length} anahtar)`);
  }

  console.log(`\n=== Çeviri tamamlandı ===`);
  console.log(`Toplam çevrilen: ${totalTranslated} anahtar`);
  console.log(`Toplam hata: ${totalErrors} anahtar`);
}

main().catch(console.error);
