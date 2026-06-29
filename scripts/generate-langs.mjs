/**
 * Tüm dil JSON dosyalarını oluşturur.
 * Temel olarak en.json'daki key'leri alır, her dil için çevirileri ekler.
 * Çalıştır: node scripts/generate-langs.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LANG_DIR = path.resolve(__dirname, "../lib/lang");

// Mevcut en.json'u oku (template olarak)
const enJson = JSON.parse(fs.readFileSync(path.join(LANG_DIR, "en.json"), "utf-8"));
const trJson = JSON.parse(fs.readFileSync(path.join(LANG_DIR, "tr.json"), "utf-8"));

// Tüm key'ler
const ALL_KEYS = Object.keys(enJson);

// Dil tanımları: { kod, ad, bayrak }
const LANGUAGES = [
  // Mevcut
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },

  // Avrupa
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "es-mx", name: "Español Mexicano", flag: "🇲🇽" },
  { code: "es-ar", name: "Español Argentino", flag: "🇦🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
  { code: "el", name: "Ελληνικά", flag: "🇬🇷" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
  { code: "cs", name: "Čeština", flag: "🇨🇿" },
  { code: "hu", name: "Magyar", flag: "🇭🇺" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "da", name: "Dansk", flag: "🇩🇰" },
  { code: "no", name: "Norsk", flag: "🇳🇴" },
  { code: "fi", name: "Suomi", flag: "🇫🇮" },
  { code: "lt", name: "Lietuvių", flag: "🇱🇹" },
  { code: "lv", name: "Latviešu", flag: "🇱🇻" },
  { code: "et", name: "Eesti", flag: "🇪🇪" },
  { code: "sk", name: "Slovenčina", flag: "🇸🇰" },
  { code: "sl", name: "Slovenščina", flag: "🇸🇮" },
  { code: "hr", name: "Hrvatski", flag: "🇭🇷" },
  { code: "bg", name: "Български", flag: "🇧🇬" },
  { code: "sr", name: "Српски", flag: "🇷🇸" },
  { code: "is", name: "Íslenska", flag: "🇮🇸" },
  { code: "mt", name: "Malti", flag: "🇲🇹" },
  { code: "ga", name: "Gaeilge", flag: "🇮🇪" },
  { code: "cy", name: "Cymraeg", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  { code: "gd", name: "Gàidhlig", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { code: "eu", name: "Euskara", flag: "🇪🇸" },
  { code: "ca", name: "Català", flag: "🇪🇸" },
  { code: "gl", name: "Galego", flag: "🇪🇸" },
  { code: "oc", name: "Occitan", flag: "🇫🇷" },
  { code: "br", name: "Brezhoneg", flag: "🇫🇷" },
  { code: "rm", name: "Rumantsch", flag: "🇨🇭" },
  { code: "sc", name: "Sardu", flag: "🇮🇹" },
  { code: "se", name: "Sámegiella", flag: "🇫🇮" },
  { code: "sq", name: "Shqip", flag: "🇦🇱" },
  { code: "bs", name: "Bosanski", flag: "🇧🇦" },
  { code: "mk", name: "Македонски", flag: "🇲🇰" },
  { code: "be", name: "Беларуская", flag: "🇧🇾" },
  { code: "lb", name: "Lëtzebuergesch", flag: "🇱🇺" },
  { code: "fy", name: "Frysk", flag: "🇳🇱" },
  { code: "nn", name: "Norsk Nynorsk", flag: "🇳🇴" },

  // Türkic
  { code: "kk", name: "Қазақша", flag: "🇰🇿" },
  { code: "uz", name: "Oʻzbekcha", flag: "🇺🇿" },
  { code: "ky", name: "Кыргызча", flag: "🇰🇬" },
  { code: "az", name: "Azərbaycan dili", flag: "🇦🇿" },
  { code: "tk", name: "Türkmençe", flag: "🇹🇲" },
  { code: "ug", name: "ئۇيغۇرچە", flag: "🇨🇳" },
  { code: "tt", name: "Татарча", flag: "🇷🇺" },
  { code: "ba", name: "Башҡортса", flag: "🇷🇺" },
  { code: "cv", name: "Чӑвашла", flag: "🇷🇺" },
  { code: "sah", name: "Саха тыла", flag: "🇷🇺" },
  { code: "mn", name: "Монгол", flag: "🇲🇳" },
  { code: "tg", name: "Тоҷикӣ", flag: "🇹🇯" },

  // Kafkasya
  { code: "ka", name: "ქართული", flag: "🇬🇪" },
  { code: "hy", name: "Հայերեն", flag: "🇦🇲" },
  { code: "os", name: "Ирон", flag: "🇷🇺" },
  { code: "ce", name: "Нохчийн", flag: "🇷🇺" },
  { code: "av", name: "Авар мацӀ", flag: "🇷🇺" },
  { code: "lez", name: "Лезги чӏал", flag: "🇷🇺" },

  // Orta Doğu
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "he", name: "עברית", flag: "🇮🇱" },
  { code: "fa", name: "فارسی", flag: "🇮🇷" },
  { code: "ps", name: "پښتو", flag: "🇦🇫" },
  { code: "ur", name: "اردو", flag: "🇵🇰" },

  // Kuzey Afrika Arapçası
  { code: "ary", name: "الدارجة (المغرب)", flag: "🇲🇦" },
  { code: "arq", name: "الجزائرية", flag: "🇩🇿" },
  { code: "aeb", name: "التونسية", flag: "🇹🇳" },
  { code: "arz", name: "المصرية", flag: "🇪🇬" },
  { code: "ayl", name: "الليبية", flag: "🇱🇾" },
  { code: "apd", name: "السودانية", flag: "🇸🇩" },
  { code: "mey", name: "الحسانية", flag: "🇲🇷" },

  // Berberi
  { code: "ber", name: "ⵜⴰⵎⴰⵣⵉⵖⵜ", flag: "🇩🇿" },
  { code: "rif", name: "ⵜⴰⵔⵉⴼⵉⵜ", flag: "🇲🇦" },
  { code: "kab", name: "ⵜⴰⵇⴱⴰⵢⵍⵉⵜ", flag: "🇩🇿" },
  { code: "shil", name: "ⵜⴰⵛⵍⵃⵉⵜ", flag: "🇲🇦" },

  // Afrika
  { code: "sw", name: "Kiswahili", flag: "🇰🇪" },
  { code: "zu", name: "isiZulu", flag: "🇿🇦" },
  { code: "xh", name: "isiXhosa", flag: "🇿🇦" },
  { code: "af", name: "Afrikaans", flag: "🇿🇦" },
  { code: "st", name: "Sesotho", flag: "🇿🇦" },
  { code: "tn", name: "Setswana", flag: "🇿🇦" },
  { code: "ts", name: "Xitsonga", flag: "🇿🇦" },
  { code: "ve", name: "Tshivenḓa", flag: "🇿🇦" },
  { code: "ss", name: "siSwati", flag: "🇿🇦" },
  { code: "nso", name: "Sepedi", flag: "🇿🇦" },
  { code: "yo", name: "Yorùbá", flag: "🇳🇬" },
  { code: "ig", name: "Igbo", flag: "🇳🇬" },
  { code: "ha", name: "Hausa", flag: "🇳🇬" },
  { code: "am", name: "አማርኛ", flag: "🇪🇹" },
  { code: "so", name: "Soomaali", flag: "🇸🇴" },
  { code: "mg", name: "Malagasy", flag: "🇲🇬" },
  { code: "rw", name: "Ikinyarwanda", flag: "🇷🇼" },
  { code: "rn", name: "Ikirundi", flag: "🇧🇮" },
  { code: "bem", name: "Ichibemba", flag: "🇿🇲" },
  { code: "wo", name: "Wolof", flag: "🇸🇳" },
  { code: "ff", name: "Fulfulde", flag: "🇸🇳" },
  { code: "bm", name: "Bamanankan", flag: "🇲🇱" },
  { code: "kg", name: "Kikongo", flag: "🇨🇩" },
  { code: "ln", name: "Lingála", flag: "🇨🇩" },
  { code: "lua", name: "Tshiluba", flag: "🇨🇩" },
  { code: "swc", name: "Swahili (Congo)", flag: "🇨🇩" },
  { code: "ny", name: "Chichewa", flag: "🇲🇼" },
  { code: "sn", name: "chiShona", flag: "🇿🇼" },
  { code: "om", name: "Afaan Oromoo", flag: "🇪🇹" },
  { code: "ti", name: "ትግርኛ", flag: "🇪🇷" },
  { code: "sg", name: "Sängö", flag: "🇨🇫" },
  { code: "ee", name: "Eʋegbe", flag: "🇬🇭" },
  { code: "tw", name: "Twi", flag: "🇬🇭" },
  { code: "ak", name: "Akan", flag: "🇬🇭" },

  // Kreoller
  { code: "ht", name: "Kreyòl Ayisyen", flag: "🇭🇹" },
  { code: "mfe", name: "Kreol Morisien", flag: "🇲🇺" },
  { code: "crs", name: "Seselwa", flag: "🇸🇨" },
  { code: "kea", name: "Kriolu", flag: "🇨🇻" },

  // Asya
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "ภาษาไทย", flag: "🇹🇭" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "fil", name: "Filipino", flag: "🇵🇭" },
  { code: "ceb", name: "Cebuano", flag: "🇵🇭" },
  { code: "bn", name: "বাংলা", flag: "🇧🇩" },
  { code: "si", name: "සිංහල", flag: "🇱🇰" },
  { code: "ta", name: "தமிழ்", flag: "🇱🇰" },
  { code: "te", name: "తెలుగు", flag: "🇮🇳" },
  { code: "mr", name: "मराठी", flag: "🇮🇳" },
  { code: "gu", name: "ગુજરાતી", flag: "🇮🇳" },
  { code: "kn", name: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ml", name: "മലയാളം", flag: "🇮🇳" },
  { code: "pa", name: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "or", name: "ଓଡ଼ିଆ", flag: "🇮🇳" },
  { code: "ne", name: "नेपाली", flag: "🇳🇵" },
  { code: "my", name: "မြန်မာဘာသာ", flag: "🇲🇲" },
  { code: "km", name: "ភាសាខ្មែរ", flag: "🇰🇭" },
  { code: "lo", name: "ລາວ", flag: "🇱🇦" },
  { code: "bo", name: "བོད་སྐད", flag: "🇨🇳" },
  { code: "dz", name: "རྫོང་ཁ", flag: "🇧🇹" },
  { code: "dv", name: "ދިވެހި", flag: "🇲🇻" },

  // Pasifik
  { code: "mi", name: "Māori", flag: "🇳🇿" },
  { code: "sm", name: "Gagana Samoa", flag: "🇼🇸" },
  { code: "to", name: "Lea Faka-Tonga", flag: "🇹🇴" },
  { code: "fj", name: "Na Vosa Vakaviti", flag: "🇫🇯" },
  { code: "tpi", name: "Tok Pisin", flag: "🇵🇬" },
  { code: "haw", name: "ʻŌlelo Hawaiʻi", flag: "🇺🇸" },

  // Yerli Amerika
  { code: "gn", name: "Avañe'ẽ", flag: "🇵🇾" },
  { code: "ay", name: "Aymar aru", flag: "🇧🇴" },
  { code: "qu", name: "Runa Simi", flag: "🇵🇪" },
  { code: "nah", name: "Nāhuatl", flag: "🇲🇽" },
  { code: "kl", name: "Kalaallisut", flag: "🇬🇱" },
];

// Her dil için JSON oluştur
for (const lang of LANGUAGES) {
  if (lang.code === "en") continue; // en.json zaten var
  if (lang.code === "tr") continue; // tr.json zaten var

  const dict = {};

  for (const key of ALL_KEYS) {
    if (key.startsWith("lang.")) {
      // Dil isimleri
      const langCode = key.replace("lang.", "");
      const found = LANGUAGES.find(l => l.code === langCode);
      dict[key] = found ? `${found.flag} ${found.name}` : key;
    } else {
      // Varsayılan olarak İngilizce metni kullan (fallback)
      // Gerçek çeviriler için bir çeviri hizmeti kullanılabilir
      dict[key] = enJson[key];
    }
  }

  const filePath = path.join(LANG_DIR, `${lang.code}.json`);
  fs.writeFileSync(filePath, JSON.stringify(dict, null, 2) + "\n", "utf-8");
  console.log(`✅ ${lang.code}.json oluşturuldu (${lang.flag} ${lang.name})`);
}

console.log(`\n🎉 Toplam ${LANGUAGES.length} dil dosyası hazır!`);
