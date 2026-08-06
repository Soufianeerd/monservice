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
      // Interdiction stricte de 'any' (MS-033)
      "@typescript-eslint/no-explicit-any": "error",
      // Interdiction du cookie de session legacy (MS-006)
      "no-restricted-globals": ["error", { name: "cookies", message: "Use requireSession() instead of direct cookie access." }]
    },
  },
];

export default eslintConfig;
