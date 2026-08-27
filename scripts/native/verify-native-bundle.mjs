/**
 * Post-build verification for the local native Vite shell.
 * Never prints secret values — only hostnames / presence flags.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const errors = [];

function fail(message) {
  errors.push(message);
}

function read(relative) {
  return readFileSync(join(root, relative), "utf8");
}

function collectFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) collectFiles(full, out);
    else out.push(full);
  }
  return out;
}

function readAllUnder(relative) {
  const abs = join(root, relative);
  return collectFiles(abs)
    .filter((p) => !p.endsWith(".map"))
    .map((p) => readFileSync(p, "utf8"))
    .join("\n");
}

const indexPath = join(root, "native-dist/index.html");
if (!existsSync(indexPath)) {
  fail("native-dist/index.html is missing");
} else {
  const indexHtml = read("native-dist/index.html");
  const assetRefs = [
    ...indexHtml.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g),
  ].map((m) => m[1].replace(/^\.\//, ""));
  for (const ref of assetRefs) {
    if (!existsSync(join(root, "native-dist", ref))) {
      fail(`native-dist missing referenced asset ${ref}`);
    }
  }
}

const bundle = readAllUnder("native-dist");
if (!bundle.includes("Kaify Ai")) {
  fail('native-dist must contain "Kaify Ai" login title');
}
if (!bundle.includes("Send login code")) {
  fail('native-dist must contain canonical "Send login code" CTA');
}
if (!bundle.includes("4 coaches. One team")) {
  fail("native-dist missing canonical login subtitle");
}
if (bundle.includes("Sign in locally")) {
  fail('native-dist must not use legacy "Sign in locally" card copy');
}
if (/Loading secure sign-in/i.test(bundle)) {
  fail('native-dist must not contain "Loading secure sign-in"');
}
if (bundle.includes("xyzcompany.supabase.co")) {
  fail("native-dist contains placeholder host xyzcompany.supabase.co");
}
if (bundle.includes("test-anon-key")) {
  fail("native-dist contains test-anon-key");
}
if (!bundle.includes("https://kaifyai.org")) {
  fail("native-dist missing kaifyai.org API base");
}
if (/service_role/i.test(bundle) || /SUPABASE_SERVICE_ROLE/i.test(bundle)) {
  fail("native-dist must not contain service_role / service role secrets");
}

const expectedHost = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
if (expectedHost) {
  try {
    const host = new URL(expectedHost).hostname;
    if (!bundle.includes(host)) {
      fail(`native-dist missing expected Supabase host ${host}`);
    }
  } catch {
    fail("NEXT_PUBLIC_SUPABASE_URL is not a valid URL during verify");
  }
} else {
  fail("NEXT_PUBLIC_SUPABASE_URL unset during verify (cannot confirm real host)");
}

function assertPackagedMirror(label, relative) {
  const packagedIndex = join(root, relative, "index.html");
  if (!existsSync(packagedIndex)) {
    fail(`${label}: ${relative}/index.html missing after sync`);
    return;
  }
  const packaged = readAllUnder(relative);
  if (!packaged.includes("Send login code")) {
    fail(`${label}: packaged assets missing "Send login code"`);
  }
  if (packaged.includes("Sign in locally")) {
    fail(`${label}: packaged assets still use legacy "Sign in locally" copy`);
  }
  if (/Loading secure sign-in/i.test(packaged)) {
    fail(`${label}: packaged assets still contain Next AuthLoadingFallback text`);
  }
  if (packaged.includes("xyzcompany.supabase.co") || packaged.includes("test-anon-key")) {
    fail(`${label}: packaged assets still contain placeholder auth config`);
  }
}

if (existsSync(join(root, "android/app/src/main/assets/public"))) {
  assertPackagedMirror("android", "android/app/src/main/assets/public");
}
if (existsSync(join(root, "ios/App/App/public"))) {
  assertPackagedMirror("ios", "ios/App/App/public");
}

const capConfigs = [
  "android/app/src/main/assets/capacitor.config.json",
  "ios/App/App/capacitor.config.json",
];
for (const relative of capConfigs) {
  if (!existsSync(join(root, relative))) continue;
  const json = JSON.parse(read(relative));
  if (json.server?.url) {
    fail(`${relative} must not set server.url (found ${json.server.url})`);
  }
  if (json.webDir && json.webDir !== "native-dist") {
    fail(`${relative} webDir must be native-dist`);
  }
}

if (process.env.CAPACITOR_SERVER_URL?.trim()) {
  // Dev sync may set this; release verify should be run with it unset.
  if (process.env.NATIVE_VERIFY_ALLOW_DEV_SERVER !== "1") {
    fail(
      "CAPACITOR_SERVER_URL is set — refuse release verification (unset for store builds)",
    );
  }
}

if (errors.length) {
  console.error("[native-verify] FAILED:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

let hostLabel = "(from bundle)";
try {
  if (expectedHost) hostLabel = new URL(expectedHost).hostname;
} catch {
  /* already failed above */
}
console.log(
  `[native-verify] OK shell=canonical-login supabase_host=${hostLabel} api=kaifyai.org server.url=absent`,
);
