/**
 * Tüm sayfalardaki sabit metinleri t() fonksiyonuna dönüştürür.
 * 
 * Kullanım: node scripts/translate-pages.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Tüm sayfa dosyaları
const PAGE_FILES = [
  "app/page.tsx",
  "app/analytics/page.tsx",
  "app/leaderboard/page.tsx",
  "app/library/page.tsx",
  "app/library/gym/page.tsx",
  "app/library/home/page.tsx",
  "app/login/page.tsx",
  "app/messages/page.tsx",
  "app/trophy-road/page.tsx",
  "app/chat/[id]/page.tsx",
  "app/chat/team/page.tsx",
];

// Component dosyaları
const COMPONENT_FILES = [
  "components/ChatBubbles.tsx",
  "components/ProfileModal.tsx",
  "components/ImagePickerModal.tsx",
  "components/StreakRoad.tsx",
  "components/GemBalance.tsx",
  "components/ContactAvatar.tsx",
  "components/messages/MessageRow.tsx",
  "components/welcome/WelcomeCard.tsx",
  "components/welcome/WelcomeExtras.tsx",
  "components/welcome/WelcomeLeaderboard.tsx",
  "components/welcome/CountryLeaderboard.tsx",
  "components/analytics/StatCard.tsx",
  "components/analytics/MacroRing.tsx",
  "components/analytics/WeeklyChart.tsx",
  "components/landing/LandingHero.tsx",
  "components/landing/LandingFeatures.tsx",
  "components/landing/LandingCoaches.tsx",
  "components/landing/LandingCTA.tsx",
  "components/landing/LandingAbout.tsx",
  "components/landing/LandingStreak.tsx",
  "components/landing/LandingLeaderboard.tsx",
  "components/landing/LandingNav.tsx",
  "components/landing/LandingFooter.tsx",
  "components/landing/WaitlistForm.tsx",
  "components/landing/LandingPage.tsx",
];

// Tespit edilen sabit string'ler ve karşılık gelen key'ler
const STRING_TO_KEY = {
  "Geri": "nav.back",
  "Home": "nav.home",
  "Analytics": "nav.analytics",
  "Messages": "nav.messages",
  "Streak": "nav.streak",
  "Market": "nav.market",
  "Settings": "nav.settings",
  "Leaderboard": "nav.leaderboard",
  "day streak": "streak.title",
  "Beginner": "streak.segment.beginner",
  "Novice": "streak.segment.novice",
  "Veteran": "streak.segment.veteran",
  "Legend": "streak.segment.legend",
  "CLAIM Lv.": "streak.claim",
  "Unlocks at day": "streak.unlock_at",
  "Meet your new look!": "streak.new_look",
  "EVOLVING...": "streak.evolving",
  "TRANSFORMING...": "streak.transforming",
  "Scan complete!": "streak.scan_complete",
  "Body scan successful": "streak.scan_success",
  "Type a message...": "chat.placeholder",
  "Send": "chat.send",
  "typing...": "chat.typing",
  "Add Photo": "chat.photo",
  "Camera": "chat.camera",
  "Gallery": "chat.gallery",
  "Scan": "chat.scan",
  "Scanning...": "chat.scanning",
  "Done": "chat.scan_done",
  "Calories": "analytics.calories",
  "Protein": "analytics.protein",
  "Carbs": "analytics.carbs",
  "Fat": "analytics.fat",
  "Water": "analytics.water",
  "Steps": "analytics.steps",
  "Weekly": "analytics.weekly",
  "Buy": "market.buy",
  "Owned": "market.owned",
  "Apply": "market.apply",
  "Applied": "market.applied",
  "Equip": "market.equip",
  "Equipped": "market.equipped",
  "Profile": "profile.title",
  "Save": "profile.save",
  "Cancel": "profile.cancel",
  "Name": "profile.name",
  "Height (cm)": "profile.height",
  "Weight (kg)": "profile.weight",
  "Gender": "profile.gender",
  "Male": "profile.male",
  "Female": "profile.female",
  "Other": "profile.other",
  "Log In": "login.title",
  "Sign in to continue": "login.subtitle",
  "Email": "login.email",
  "Password": "login.password",
  "Forgot password?": "login.forgot",
  "Don't have an account?": "login.no_account",
  "Sign Up": "login.signup",
  "or continue with": "login.or",
  "Continue with Google": "login.google",
  "Continue with Apple": "login.apple",
  "Library": "library.title",
  "Gym": "library.gym",
  "Home": "library.home",
  "Exercises": "library.exercises",
  "Workouts": "library.workouts",
  "Trophy Road": "trophy.title",
  "Trophies": "trophy.trophies",
  "Achievements": "trophy.achievements",
  "Unlocked": "trophy.unlocked",
  "Locked": "trophy.locked",
  "Progress": "trophy.progress",
  "No messages yet": "messages.empty",
  "Start a conversation": "messages.start",
  "Search": "messages.search",
  "Online": "messages.online",
  "Offline": "messages.offline",
  "Last seen": "messages.last_seen",
  "New message": "messages.new",
  "Delete": "messages.delete",
  "Archive": "messages.archive",
  "Global Rankings": "leaderboard.title",
  "Country Rankings": "leaderboard.country",
  "Your Rank": "leaderboard.your_rank",
  "Points": "leaderboard.points",
  "Level": "leaderboard.level",
  "Country": "leaderboard.country",
  "This Week": "leaderboard.week",
  "This Month": "leaderboard.month",
  "All Time": "leaderboard.all_time",
  "Get Started": "landing.cta",
  "Learn More": "landing.learn_more",
  "Features": "landing.features",
  "About": "landing.about",
  "Contact": "landing.contact",
  "Privacy Policy": "landing.privacy",
  "Terms of Service": "landing.terms",
  "All rights reserved": "landing.rights",
  "Join the waitlist": "landing.waitlist",
  "Your email": "landing.email_placeholder",
  "Subscribe": "landing.subscribe",
  "Thank you!": "landing.thank_you",
  "You're on the list!": "landing.on_list",
};

// Her dosyayı işle
const allFiles = [...PAGE_FILES, ...COMPONENT_FILES];

for (const relPath of allFiles) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${relPath} bulunamadı, atlanıyor`);
    continue;
  }

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;

  // useLang import'u var mı kontrol et
  const hasUseLangImport = content.includes('from "@/lib/lang-context"');
  
  if (!hasUseLangImport && (content.includes("'use client'") || content.includes('"use client"'))) {
    // useLang import'u ekle
    const importLine = `import { useLang } from "@/lib/lang-context";\n`;
    const lastImportIndex = content.lastIndexOf("import ");
    const nextLineAfterImport = content.indexOf("\n", lastImportIndex);
    if (lastImportIndex >= 0) {
      content = content.slice(0, nextLineAfterImport + 1) + importLine + content.slice(nextLineAfterImport + 1);
      modified = true;
    }
  }

  // const { t } = useLang(); ekle (eğer yoksa ve useLang import'u varsa)
  const hasTUseLang = content.includes("const { t } = useLang()") || content.includes("const { t } = useLang");
  
  if (!hasTUseLang && (content.includes('useLang') || content.includes('from "@/lib/lang-context"'))) {
    // Fonksiyon component'lerinin başlangıcını bul
    // Önce export default function, sonra export function, sonra function kalıplarını dene
    let funcMatch = content.match(/export default function (\w+)/);
    let funcName = funcMatch ? funcMatch[1] : null;
    
    if (!funcName) {
      funcMatch = content.match(/export function (\w+)/);
      funcName = funcMatch ? funcMatch[1] : null;
    }
    
    if (funcName) {
      const funcStart = content.indexOf(`function ${funcName}(`);
      // Fonksiyon imzasının sonundaki ) { veya ): ...Props) { kısmını bul
      // Önce fonksiyon parametrelerinin bittiği yeri bul
      let parenCount = 0;
      let foundParen = false;
      let bodyStart = -1;
      for (let i = funcStart; i < content.length; i++) {
        const ch = content[i];
        if (ch === '(') {
          parenCount++;
          foundParen = true;
        } else if (ch === ')') {
          parenCount--;
          if (foundParen && parenCount === 0) {
            // )'den sonraki ilk { 'i bul
            const afterParen = content.indexOf("{", i);
            if (afterParen >= 0) {
              bodyStart = afterParen;
            }
            break;
          }
        }
      }
      if (bodyStart >= 0) {
        const insertPos = bodyStart + 1;
        const indent = "  ";
        content = content.slice(0, insertPos) + `\n${indent}const { t } = useLang();` + content.slice(insertPos);
        modified = true;
      }
    }
  }

  // Sabit string'leri t() ile değiştir
  for (const [str, key] of Object.entries(STRING_TO_KEY)) {
    // >Metin< şeklindeki JSX metinlerini bul
    const regex = new RegExp(`>${escapeRegex(str)}<`, "g");
    if (regex.test(content)) {
      content = content.replace(regex, `>{t("${key}")}<`);
      modified = true;
    }

    // aria-label="Metin"
    const ariaRegex = new RegExp(`aria-label="${escapeRegex(str)}"`, "g");
    if (ariaRegex.test(content)) {
      content = content.replace(ariaRegex, `aria-label={t("${key}")}`);
      modified = true;
    }

    // placeholder="Metin"
    const placeholderRegex = new RegExp(`placeholder="${escapeRegex(str)}"`, "g");
    if (placeholderRegex.test(content)) {
      content = content.replace(placeholderRegex, `placeholder={t("${key}")}`);
      modified = true;
    }

    // title="Metin"
    const titleRegex = new RegExp(`title="${escapeRegex(str)}"`, "g");
    if (titleRegex.test(content)) {
      content = content.replace(titleRegex, `title={t("${key}")}`);
      modified = true;
    }

    // alt="Metin"
    const altRegex = new RegExp(`alt="${escapeRegex(str)}"`, "g");
    if (altRegex.test(content)) {
      content = content.replace(altRegex, `alt={t("${key}")}`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`✅ ${relPath} güncellendi`);
  } else {
    console.log(`⏭️  ${relPath} - değişiklik yok`);
  }
}

console.log("\n🎉 Tüm dosyalar işlendi!");

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
