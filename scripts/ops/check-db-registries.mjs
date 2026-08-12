import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "supabase/migrations");
const tables = new Set();
const funcs = new Set();

for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
  const t = readFileSync(join(dir, f), "utf8");
  for (const m of t.matchAll(
    /create table(?: if not exists)? public\.([a-z0-9_]+)/gi,
  )) {
    tables.add(m[1]);
  }
  const re =
    /create(?: or replace)? function (?:public\.)?([a-z0-9_]+)\s*\([^)]*\)[\s\S]*?security definer/gi;
  let m;
  while ((m = re.exec(t))) funcs.add(m[1]);
}

const schemaReg = readFileSync("tests/db/schema-registry.ts", "utf8");
const rpcReg = readFileSync("tests/db/rpc-registry.ts", "utf8");

const missingTables = [...tables]
  .filter((t) => !schemaReg.includes(`table: "${t}"`))
  .sort();
const missingFuncs = [...funcs]
  .filter((n) => !rpcReg.includes(`name: "${n}"`))
  .sort();

console.log("tables", tables.size, "missing", missingTables.length);
console.log(missingTables.join("\n"));
console.log("secdef", funcs.size, "missing", missingFuncs.length);
console.log(missingFuncs.join("\n"));
