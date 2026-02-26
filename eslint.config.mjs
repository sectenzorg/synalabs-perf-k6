import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "prefer-const": "off",
      "react/jsx-no-comment-textnodes": "off",
      "@next/next/no-page-custom-font": "off",
      "@next/next/google-font-display": "off",
      "react-hooks/exhaustive-deps": "off",
    }
  }
];

export default eslintConfig;
