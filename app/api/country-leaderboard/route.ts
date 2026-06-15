import { NextRequest, NextResponse } from "next/server";
import { allowMethods, apiError, leaderboardQuerySchema } from "@/lib/api-security";

// İnsani Gelişim Endeksi (HDI) 2022 sıralamasına göre ülkeler
// Kaynak: UNDP Human Development Report 2023/2024
const COUNTRIES_BY_HDI = [
  { code: "ch", name: "Switzerland" }, { code: "no", name: "Norway" },
  { code: "is", name: "Iceland" }, { code: "hk", name: "Hong Kong" },
  { code: "dk", name: "Denmark" }, { code: "se", name: "Sweden" },
  { code: "ie", name: "Ireland" }, { code: "de", name: "Germany" },
  { code: "sg", name: "Singapore" }, { code: "nl", name: "Netherlands" },
  { code: "li", name: "Liechtenstein" }, { code: "fi", name: "Finland" },
  { code: "gb", name: "United Kingdom" }, { code: "nz", name: "New Zealand" },
  { code: "ae", name: "UAE" }, { code: "ca", name: "Canada" },
  { code: "kr", name: "South Korea" }, { code: "au", name: "Australia" },
  { code: "lu", name: "Luxembourg" }, { code: "be", name: "Belgium" },
  { code: "at", name: "Austria" }, { code: "jp", name: "Japan" },
  { code: "il", name: "Israel" }, { code: "si", name: "Slovenia" },
  { code: "us", name: "United States" }, { code: "mt", name: "Malta" },
  { code: "es", name: "Spain" }, { code: "fr", name: "France" },
  { code: "cy", name: "Cyprus" }, { code: "it", name: "Italy" },
  { code: "ee", name: "Estonia" }, { code: "tr", name: "Türkiye" },
  { code: "ct", name: "Northern Cyprus" }, { code: "cz", name: "Czech Republic" },
  { code: "gr", name: "Greece" }, { code: "pl", name: "Poland" },
  { code: "sa", name: "Saudi Arabia" }, { code: "lt", name: "Lithuania" },
  { code: "pt", name: "Portugal" }, { code: "lv", name: "Latvia" },
  { code: "sk", name: "Slovakia" }, { code: "hu", name: "Hungary" },
  { code: "ro", name: "Romania" }, { code: "hr", name: "Croatia" },
  { code: "cl", name: "Chile" }, { code: "qa", name: "Qatar" },
  { code: "bh", name: "Bahrain" }, { code: "rs", name: "Serbia" },
  { code: "ru", name: "Russia" }, { code: "my", name: "Malaysia" },
  { code: "bg", name: "Bulgaria" }, { code: "me", name: "Montenegro" },
  { code: "kz", name: "Kazakhstan" }, { code: "al", name: "Albania" },
  { code: "mk", name: "North Macedonia" }, { code: "ba", name: "Bosnia" },
  { code: "az", name: "Azerbaijan" }, { code: "ua", name: "Ukraine" },
  { code: "mu", name: "Mauritius" }, { code: "md", name: "Moldova" },
  { code: "ge", name: "Georgia" }, { code: "am", name: "Armenia" },
  { code: "by", name: "Belarus" }, { code: "cn", name: "China" },
  { code: "th", name: "Thailand" }, { code: "cr", name: "Costa Rica" },
  { code: "ar", name: "Argentina" }, { code: "br", name: "Brazil" },
  { code: "co", name: "Colombia" }, { code: "pe", name: "Peru" },
  { code: "mx", name: "Mexico" }, { code: "uy", name: "Uruguay" },
  { code: "ec", name: "Ecuador" }, { code: "pa", name: "Panama" },
  { code: "do", name: "Dominican Republic" }, { code: "cu", name: "Cuba" },
  { code: "ve", name: "Venezuela" }, { code: "bo", name: "Bolivia" },
  { code: "py", name: "Paraguay" }, { code: "sv", name: "El Salvador" },
  { code: "gt", name: "Guatemala" }, { code: "hn", name: "Honduras" },
  { code: "ni", name: "Nicaragua" }, { code: "ir", name: "Iran" },
  { code: "lb", name: "Lebanon" }, { code: "jo", name: "Jordan" },
  { code: "ps", name: "Palestine" }, { code: "eg", name: "Egypt" },
  { code: "tn", name: "Tunisia" }, { code: "dz", name: "Algeria" },
  { code: "ma", name: "Morocco" }, { code: "om", name: "Oman" },
  { code: "kw", name: "Kuwait" }, { code: "id", name: "Indonesia" },
  { code: "ph", name: "Philippines" }, { code: "vn", name: "Vietnam" },
  { code: "la", name: "Laos" }, { code: "kh", name: "Cambodia" },
  { code: "mm", name: "Myanmar" }, { code: "mn", name: "Mongolia" },
  { code: "bt", name: "Bhutan" }, { code: "np", name: "Nepal" },
  { code: "bd", name: "Bangladesh" }, { code: "lk", name: "Sri Lanka" },
  { code: "in", name: "India" }, { code: "pk", name: "Pakistan" },
  { code: "af", name: "Afghanistan" }, { code: "uz", name: "Uzbekistan" },
  { code: "tm", name: "Turkmenistan" }, { code: "kg", name: "Kyrgyzstan" },
  { code: "tj", name: "Tajikistan" }, { code: "za", name: "South Africa" },
  { code: "bw", name: "Botswana" }, { code: "na", name: "Namibia" },
  { code: "ga", name: "Gabon" }, { code: "ke", name: "Kenya" },
  { code: "ng", name: "Nigeria" }, { code: "gh", name: "Ghana" },
  { code: "ci", name: "Côte d'Ivoire" }, { code: "sn", name: "Senegal" },
  { code: "ml", name: "Mali" }, { code: "bf", name: "Burkina Faso" },
  { code: "ne", name: "Niger" }, { code: "td", name: "Chad" },
  { code: "cm", name: "Cameroon" }, { code: "cf", name: "Central African Republic" },
  { code: "cd", name: "DR Congo" }, { code: "ao", name: "Angola" },
  { code: "zm", name: "Zambia" }, { code: "zw", name: "Zimbabwe" },
  { code: "mw", name: "Malawi" }, { code: "mz", name: "Mozambique" },
  { code: "mg", name: "Madagascar" }, { code: "tz", name: "Tanzania" },
  { code: "ug", name: "Uganda" }, { code: "rw", name: "Rwanda" },
  { code: "bi", name: "Burundi" }, { code: "sd", name: "Sudan" },
  { code: "ss", name: "South Sudan" }, { code: "et", name: "Ethiopia" },
  { code: "so", name: "Somalia" }, { code: "dj", name: "Djibouti" },
  { code: "er", name: "Eritrea" }, { code: "lr", name: "Liberia" },
  { code: "sl", name: "Sierra Leone" }, { code: "gn", name: "Guinea" },
  { code: "tg", name: "Togo" }, { code: "bj", name: "Benin" },
  { code: "gm", name: "Gambia" }, { code: "mr", name: "Mauritania" },
  { code: "ls", name: "Lesotho" }, { code: "sz", name: "Eswatini" },
  { code: "km", name: "Comoros" }, { code: "tl", name: "Timor-Leste" },
  { code: "fj", name: "Fiji" }, { code: "pg", name: "Papua New Guinea" },
  { code: "sb", name: "Solomon Islands" }, { code: "vu", name: "Vanuatu" },
  { code: "ws", name: "Samoa" }, { code: "to", name: "Tonga" },
  { code: "ki", name: "Kiribati" }, { code: "fm", name: "Micronesia" },
  { code: "mh", name: "Marshall Islands" }, { code: "pw", name: "Palau" },
  { code: "nr", name: "Nauru" }, { code: "tv", name: "Tuvalu" },
  { code: "ht", name: "Haiti" }, { code: "gy", name: "Guyana" },
  { code: "sr", name: "Suriname" }, { code: "bz", name: "Belize" },
  { code: "ag", name: "Antigua" }, { code: "dm", name: "Dominica" },
  { code: "gd", name: "Grenada" }, { code: "kn", name: "St Kitts" },
  { code: "lc", name: "St Lucia" }, { code: "vc", name: "St Vincent" },
  { code: "cv", name: "Cape Verde" }, { code: "st", name: "Sao Tome" },
  { code: "gw", name: "Guinea-Bissau" }, { code: "gq", name: "Equatorial Guinea" },
  { code: "cg", name: "Congo" }, { code: "sy", name: "Syria" },
  { code: "ye", name: "Yemen" }, { code: "jm", name: "Jamaica" },
  { code: "tt", name: "Trinidad" }, { code: "bs", name: "Bahamas" },
  { code: "bb", name: "Barbados" }, { code: "sc", name: "Seychelles" },
  { code: "mv", name: "Maldives" }, { code: "bn", name: "Brunei" },
  { code: "fo", name: "Faroe Islands" }, { code: "gl", name: "Greenland" },
  { code: "mc", name: "Monaco" }, { code: "pr", name: "Puerto Rico" },
];

const FIRST_NAMES = [
  "Alex", "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia",
  "Mason", "Isabella", "James", "Mia", "Benjamin", "Charlotte", "Lucas",
  "Amelia", "Henry", "Harper", "Alexander", "Evelyn", "Daniel", "Abigail",
  "Matthew", "Emily", "Jackson", "Ella", "Logan", "Avery", "David", "Scarlett",
  "Joseph", "Grace", "Samuel", "Chloe", "Sebastian", "Victoria", "Andrew", "Riley",
  "Jack", "Aria", "Ryan", "Lily", "William", "Aurora", "Owen", "Zoey",
  "Dylan", "Nora", "Luke", "Camila", "Nathan", "Penelope", "Gabriel", "Layla",
  "Isaac", "Luna", "John", "Stella", "Oscar", "Hazel", "Max", "Ellie",
  "Leo", "Maya", "Kai", "Levi", "Adam", "Eli", "Ezra", "Ian",
];

function generateDemoUsers() {
  const users: Array<{ id: string; name: string; countryCode: string; countryName: string; flagCode: string; streak: number }> = [];
  let userId = 1;

  for (const country of COUNTRIES_BY_HDI) {
    const userCount = 1 + Math.floor(Math.random() * 5);
    for (let i = 0; i < userCount; i++) {
      const name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const streak = 1 + Math.floor(Math.random() * 60);
      users.push({
        id: `user_${String(userId).padStart(3, "0")}`,
        name: `${name}${userId > FIRST_NAMES.length ? ` ${userId}` : ""}`,
        countryCode: country.code,
        countryName: country.name,
        flagCode: country.code,
        streak,
      });
      userId++;
    }
  }

  return users;
}

const DEMO_USERS = generateDemoUsers();

export async function GET(request: NextRequest) {
  const methodCheck = allowMethods(request, ["GET"]);
  if (methodCheck) return methodCheck;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "user_001";

    // Zod ile query validasyonu
    const parsed = leaderboardQuerySchema.safeParse({ userId });
    if (!parsed.success) {
      return apiError("Invalid query parameters.", 400);
    }

    const cleanUserId = parsed.data.userId || "user_001";

    const currentUser = DEMO_USERS.find((u) => u.id === cleanUserId);
    const userCountry = currentUser?.countryCode ?? null;

    const countryMap = new Map<string, { countryCode: string; countryName: string; flagCode: string; totalStreak: number; userCount: number }>();

    for (const user of DEMO_USERS) {
      const existing = countryMap.get(user.countryCode);
      if (existing) {
        existing.totalStreak += user.streak;
        existing.userCount += 1;
      } else {
        countryMap.set(user.countryCode, {
          countryCode: user.countryCode,
          countryName: user.countryName,
          flagCode: user.flagCode,
          totalStreak: user.streak,
          userCount: 1,
        });
      }
    }

    let allEntries = Array.from(countryMap.values());

    const turkeyEntry = allEntries.find((c) => c.countryCode === "tr");
    const usEntry = allEntries.find((c) => c.countryCode === "us");
    const brazilEntry = allEntries.find((c) => c.countryCode === "br");

    allEntries = allEntries.filter((c) => !["tr", "us", "br"].includes(c.countryCode));

    const europeanCodes = new Set([
      "al", "at", "ba", "be", "bg", "by", "ch", "ct", "cy", "cz", "de", "dk",
      "ee", "es", "fi", "fo", "fr", "gb", "ge", "gl", "gr", "hr", "hu",
      "ie", "is", "it", "kz", "li", "lt", "lu", "lv", "mc", "md", "me",
      "mk", "mt", "nl", "no", "pl", "pt", "ro", "rs", "ru", "se", "si",
      "sk", "ua",
    ]);

    const europeanEntries = allEntries.filter((c) => europeanCodes.has(c.countryCode));
    const restEntries = allEntries.filter((c) => !europeanCodes.has(c.countryCode));

    const hdiOrder = new Map(COUNTRIES_BY_HDI.map((c, i) => [c.code, i]));

    europeanEntries.sort((a, b) => {
      const aIdx = hdiOrder.get(a.countryCode) ?? 999;
      const bIdx = hdiOrder.get(b.countryCode) ?? 999;
      return aIdx - bIdx;
    });

    restEntries.sort((a, b) => {
      const aIdx = hdiOrder.get(a.countryCode) ?? 999;
      const bIdx = hdiOrder.get(b.countryCode) ?? 999;
      return aIdx - bIdx;
    });

    const leaderboard = [
      ...(turkeyEntry ? [turkeyEntry] : []),
      ...(usEntry ? [usEntry] : []),
      ...(brazilEntry ? [brazilEntry] : []),
      ...europeanEntries,
      ...restEntries,
    ];

    const userCountryRank = userCountry
      ? leaderboard.findIndex((c) => c.countryCode === userCountry) + 1
      : null;

    return NextResponse.json({
      leaderboard,
      userCountry,
      userCountryRank,
      totalCountries: leaderboard.length,
    });
  } catch (error) {
    console.error("[api/country-leaderboard] Error:", error);
    return apiError("Sunucu hatası", 500);
  }
}
