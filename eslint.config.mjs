import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "output/**",
    ".playwright-cli/**",
  ]),
  { files: ["tests/**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  // playwright-cli evaluates each browser check as a standalone async function.
  { files: ["tests/browser/*.js"], rules: { "@typescript-eslint/no-unused-expressions": "off" } },
]);

export default eslintConfig;
