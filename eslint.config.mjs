import next from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: { parser: tsParser },
    plugins: { "@next/next": next },
    rules: {
      ...next.configs.recommended.rules,
      "no-debugger": "error",
      "no-unreachable": "error",
    },
  },
];
