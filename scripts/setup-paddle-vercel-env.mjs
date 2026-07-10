#!/usr/bin/env node
/**
 * Upsert Paddle env vars on Vercel (kaify project).
 * Usage: node scripts/setup-paddle-vercel-env.mjs
 */
import { spawnSync } from "node:child_process";

const ENVIRONMENTS = ["production", "preview", "development"];

const VARS = {
  NEXT_PUBLIC_PADDLE_ENV: "production",
  NEXT_PUBLIC_PADDLE_PRICE_ESSENTIAL: "pri_01kx5zdq1h5gqx7haw1zx8d1sm",
  NEXT_PUBLIC_PADDLE_PRICE_ESSENTIAL_YEARLY: "pri_01kx5zj0y4st5vhvrz59zm6e13",
  NEXT_PUBLIC_PADDLE_PRICE_PRO: "pri_01kx5zwffccfx1prqtj0b7r3t9",
  NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY: "pri_01kx601q2zpzgqnmt36647dkm9",
  NEXT_PUBLIC_PADDLE_PRICE_PREMIUM: "pri_01kx604fmcrrrk0n1wyqgg001g",
  NEXT_PUBLIC_PADDLE_PRICE_PREMIUM_YEARLY: "pri_01kx605e406052t6nbzztgz1dv",
  PADDLE_PRICE_ESSENTIAL: "pri_01kx5zdq1h5gqx7haw1zx8d1sm",
  PADDLE_PRICE_ESSENTIAL_YEARLY: "pri_01kx5zj0y4st5vhvrz59zm6e13",
  PADDLE_PRICE_PRO: "pri_01kx5zwffccfx1prqtj0b7r3t9",
  PADDLE_PRICE_PRO_YEARLY: "pri_01kx601q2zpzgqnmt36647dkm9",
  PADDLE_PRICE_PREMIUM_MAX: "pri_01kx604fmcrrrk0n1wyqgg001g",
  PADDLE_PRICE_PREMIUM_MAX_YEARLY: "pri_01kx605e406052t6nbzztgz1dv",
};

function upsertEnv(name, value, environment) {
  const remove = spawnSync("npx", ["vercel", "env", "rm", name, environment, "--yes"], {
    stdio: "ignore",
    shell: true,
  });
  void remove.status;

  const add = spawnSync("npx", ["vercel", "env", "add", name, environment], {
    input: value,
    encoding: "utf8",
    shell: true,
  });

  if (add.status !== 0) {
    console.error(add.stdout || add.stderr);
    throw new Error(`Failed to set ${name} (${environment})`);
  }
  console.log(`✓ ${name} → ${environment}`);
}

for (const environment of ENVIRONMENTS) {
  for (const [name, value] of Object.entries(VARS)) {
    upsertEnv(name, value, environment);
  }
}

console.log("Paddle price env vars synced to Vercel.");
