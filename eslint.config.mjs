import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/", "web-ext-artifacts/", "assets/js/tlds.js"],
  },
  js.configs.recommended,
  {
    files: ["assets/js/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: { ...globals.browser, ...globals.webextensions },
    },
  },
  {
    files: ["assets/js/theme-init.js"],
    languageOptions: { sourceType: "script" },
  },
  {
    files: ["scripts/**/*.mjs", "tests/**/*.mjs", "*.mjs"],
    languageOptions: { globals: globals.node },
  },
];
