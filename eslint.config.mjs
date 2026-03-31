import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw.js", // service worker uses module assignment
  ]),
  {
    rules: {
      // Downgrade React 19 strict rules to warnings for demo phase.
      // TODO: refactor setState-in-effect patterns and inline components post-revenue
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
]);

export default eslintConfig;
