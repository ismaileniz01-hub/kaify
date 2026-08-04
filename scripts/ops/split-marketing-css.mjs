import fs from "node:fs";

const cssPath = "app/globals.css";
const lines = fs.readFileSync(cssPath, "utf8").split(/\n/);

const landingStart = lines.findIndex((l) => l.includes("/* ===== LANDING PAGE ====="));
const leaderboardStart = lines.findIndex((l) =>
  l.includes("/* ===== LEADERBOARD ====="),
);
const pricingStart = lines.findIndex((l) => l.includes("/* ===== PRICING PAGE ====="));
const myAccountStart = lines.findIndex((l) =>
  l.includes("/* ===== MY ACCOUNT PAGE ====="),
);
const signupStart = lines.findIndex((l) => l.startsWith(".signup-hero"));

if (
  landingStart < 0 ||
  leaderboardStart < 0 ||
  pricingStart < 0 ||
  myAccountStart < 0 ||
  signupStart < 0
) {
  console.error({ landingStart, leaderboardStart, pricingStart, myAccountStart, signupStart });
  process.exit(1);
}

const landing = lines.slice(landingStart, leaderboardStart);
const pricing = lines.slice(pricingStart, myAccountStart);
const signup = lines.slice(signupStart);

const marketing = [...landing, "", ...pricing, "", ...signup].join("\n") + "\n";
fs.mkdirSync("app/styles", { recursive: true });
fs.writeFileSync("app/styles/marketing.css", marketing);

const newGlobals = [
  ...lines.slice(0, landingStart),
  ...lines.slice(leaderboardStart, pricingStart),
  ...lines.slice(myAccountStart, signupStart),
].join("\n");

if (!newGlobals.endsWith("\n")) {
  fs.writeFileSync(cssPath, newGlobals + "\n");
} else {
  fs.writeFileSync(cssPath, newGlobals);
}

console.log(
  JSON.stringify({
    globalsBefore: lines.length,
    globalsAfter: newGlobals.split(/\n/).length,
    marketingLines: marketing.split(/\n/).length,
    ranges: { landingStart, leaderboardStart, pricingStart, myAccountStart, signupStart },
  }),
);
