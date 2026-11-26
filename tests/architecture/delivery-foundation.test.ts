import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { describe, expect, it } from "vitest";

/**
 * Delivery guardrails (audit K-012, K-049, K-056, K-058, K-062, K-063, K-137).
 * These checks keep the pipeline honest: one Node major everywhere, CI that
 * only reads the repository, pinned third-party actions, a secret scanner with
 * real rules, and no automation that pushes or deploys on its own.
 */
const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const workflowDir = ".github/workflows";
const workflows = readdirSync(join(root, workflowDir))
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => ({ name, text: read(`${workflowDir}/${name}`) }));

type Step = { uses?: string; run?: string; with?: Record<string, unknown> };
type Job = { permissions?: Record<string, string>; steps?: Step[] };
type Workflow = { permissions?: Record<string, string>; jobs: Record<string, Job> };
const parsed = workflows.map(({ name, text }) => ({ name, doc: load(text) as Workflow }));
const steps = parsed.flatMap(({ name, doc }) =>
  Object.values(doc.jobs).flatMap((job) => (job.steps ?? []).map((step) => ({ name, step }))),
);

describe("delivery foundation", () => {
  it("uses one Node major in engines, .nvmrc, CI and Codemagic", () => {
    const engines = JSON.parse(read("package.json")).engines.node as string;
    const major = engines.match(/^(\d+)/)?.[1];
    expect(major).toBe("24");
    expect(read(".nvmrc").trim()).toBe(major);
    const ciVersions = steps
      .filter(({ step }) => step.uses?.startsWith("actions/setup-node@"))
      .map(({ step }) => String(step.with?.["node-version"]));
    expect(ciVersions.length).toBeGreaterThan(0);
    expect(new Set(ciVersions)).toEqual(new Set([major]));
    const codemagic = [...read("codemagic.yaml").matchAll(/^\s+node:\s*(\S+)/gm)].map((m) => m[1]);
    expect(codemagic.length).toBeGreaterThan(0);
    expect(new Set(codemagic)).toEqual(new Set([major]));
  });

  it("pins every third-party action to a full commit SHA", () => {
    const external = steps.filter(({ step }) => step.uses && !step.uses.startsWith("./"));
    expect(external.length).toBeGreaterThan(0);
    for (const { name, step } of external) {
      expect(step.uses, `${name}: ${step.uses}`).toMatch(/^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/);
    }
  });

  it("gives workflows read-only repository access and never pushes", () => {
    // Only these scopes may be granted beyond reading the repository.
    const allowed: Record<string, string[]> = {
      contents: ["read"],
      checks: ["write"],
      actions: ["read"],
      "pull-requests": ["read"],
    };
    const assertScopes = (where: string, permissions: unknown) => {
      // A string such as "write-all" or "read-all" would hide every scope.
      expect(typeof permissions, where).toBe("object");
      for (const [scope, level] of Object.entries(permissions as Record<string, string>)) {
        expect(allowed[scope] ?? [], `${where}: ${scope}=${level}`).toContain(level);
      }
    };
    for (const { name, doc } of parsed) {
      expect(doc.permissions?.contents, `${name}: top-level permissions`).toBe("read");
      assertScopes(`${name}: top-level`, doc.permissions);
      for (const [jobName, job] of Object.entries(doc.jobs)) {
        if (job.permissions !== undefined) assertScopes(`${name}/${jobName}`, job.permissions);
      }
    }
    for (const { name, step } of steps) {
      expect(step.run ?? "", `${name}: git push`).not.toMatch(/\bgit\s+push\b/);
    }
  });

  it("runs the full lint, type, test and build gate in CI", () => {
    const ci = parsed.find(({ name }) => name === "ci.yml")!.doc;
    const runs = (ci.jobs.verify.steps ?? []).map((step) => step.run ?? "");
    for (const command of [
      "npm ci",
      "npm run lint:strict",
      "npm run typecheck",
      "npm run test:coverage",
      "npm run build",
    ]) {
      expect(runs).toContain(command);
    }
    expect(JSON.parse(read("package.json")).scripts["lint:strict"]).toBe(
      "eslint . --max-warnings 0",
    );
  });

  it("builds and starts the CI server with values production mode accepts", () => {
    // lib/startup/validate-env.ts and lib/supabase/env.ts refuse these in production.
    const placeholder = /your_|_here|changeme|replace_me|placeholder/i;
    const ci = parsed.find(({ name }) => name === "ci.yml")!.doc;
    const verify = ci.jobs.verify.steps as (Step & { name?: string; env?: Record<string, string> })[];
    for (const name of ["Build", "Start production server"]) {
      const env = verify.find((step) => step.name === name)?.env ?? {};
      for (const key of [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "CSRF_SECRET",
        "CRON_SECRET",
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
        "ADMIN_EMAIL",
        "ADMIN_HUB_PASSWORD",
        "ADMIN_HUB_SECRET",
        "PADDLE_NOTIFICATION_WEBHOOK_SECRET",
      ]) {
        expect(env[key], `${name}: ${key}`).toBeTruthy();
        expect(env[key], `${name}: ${key}`).not.toMatch(placeholder);
      }
      // Never a real host: requests from the CI server must not leave the runner.
      expect(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname).toMatch(/\.invalid$/);
      expect(new URL(env.UPSTASH_REDIS_REST_URL).hostname).toMatch(/\.invalid$/);
    }
  });

  it("scans secrets with gitleaks' default rules and reviewed fingerprints only", () => {
    expect(read(".gitleaks.toml")).toMatch(/\[extend\]\s*\n\s*useDefault\s*=\s*true/);
    const ignored = read(".gitleaksignore")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    for (const line of ignored) {
      // file:rule:line or commit:file:rule:line, never a bare path.
      expect(line, line).toMatch(/^([0-9a-f]{40}:)?[^:]+:[\w-]+:\d+$/);
    }
  });

  it("keeps Vercel from deploying a second production", () => {
    expect(JSON.parse(read("vercel.json")).git?.deploymentEnabled).toBe(false);
  });

  it("has no agent rule that pushes or deploys without review", () => {
    const dir = join(root, ".cursor/rules");
    const rules = existsSync(dir) ? readdirSync(dir).map((f) => read(`.cursor/rules/${f}`)) : [];
    for (const text of rules) {
      expect(text).not.toMatch(/vercel\s+(deploy|--prod)|push to the current branch|without waiting for the user/i);
    }
  });

  it("checks production migration drift in a protected workflow", () => {
    const db = parsed.find(({ name }) => name === "db-migrations.yml")?.doc as Workflow & {
      on: Record<string, unknown>;
    };
    expect(db).toBeDefined();
    // A pull request runs its own copy of the workflow: it must never reach production secrets.
    expect(Object.keys(db.on)).not.toContain("pull_request");
    expect(Object.keys(db.on)).not.toContain("pull_request_target");
    const apply = db.jobs.apply as Job & { environment?: string; if?: string; needs?: unknown };
    const drift = db.jobs.drift as Job & { environment?: string };
    expect(apply.environment).toBe("production");
    expect(drift.environment).toBe("db-drift");
    expect(apply.if).toContain("workflow_dispatch");
    // Apply must be reachable while migrations are pending: it may not wait for a strict drift job.
    expect(apply.needs).toBeUndefined();
    const applyRuns = (apply.steps ?? []).map((s) => s.run ?? "");
    expect(applyRuns.some((r) => r.includes("check-migration-history.sh /tmp/migration-list.txt allow-pending"))).toBe(true);
    // Secrets are scoped to steps, never to the whole workflow.
    expect(JSON.stringify((db as { env?: unknown }).env ?? {})).not.toContain("secrets.");
    const runs = Object.values(db!.jobs).flatMap((job) => (job.steps ?? []).map((s) => s.run ?? ""));
    expect(runs.some((r) => r.includes("supabase db diff --linked"))).toBe(true);
    expect(runs.some((r) => r.includes("supabase db push --linked --dry-run"))).toBe(true);
  });
});
