import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default tseslint.config(
  {
    ignores: [".next/", "node_modules/", "dist/", "coverage/", "out/", "*.js"]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals,
  {
    rules: {
      // Overrides for TypeScript to warn instead of failing the build blindly
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      // French text uses a lot of apostrophes, escaping them all is counterproductive.
      "react/no-unescaped-entities": "off",
      "no-useless-escape": "warn",
      "react-compiler/react-compiler": "off",
      // standard data fetching patterns trigger this
      "react-hooks/set-state-in-effect": "warn"
    }
  }
);
