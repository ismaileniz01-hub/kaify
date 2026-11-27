import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    // Generated or vendored output. `next lint` skipped these implicitly; the
    // repo-wide `eslint .` gate (lint:strict) needs them listed.
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "native-dist/**",
      ".capacitor-build-stash/**",
      "playwright-report/**",
      "test-results/**",
      "blob-report/**",
      ".lighthouseci/**",
      "android/**/build/**",
      "ios/**/build/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // The native shell is a Vite app, not Next.js: next/image does not apply there.
    files: ["native-app/**"],
    rules: { "@next/next/no-img-element": "off" },
  },
  {
    rules: {
      // Mevcut projede önceden var olan hatalar için geçici tolerans
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "off",
      // A leading underscore marks a parameter or binding that is unused on purpose.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
