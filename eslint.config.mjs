import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [".next/", "node_modules/", "dist/", "coverage/", "out/", "*.js"]
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": {
        rules: {
          "exhaustive-deps": { create: () => ({}) },
          "set-state-in-effect": { create: () => ({}) }
        }
      },
      "@next/next": {
        rules: {
          "no-img-element": { create: () => ({}) }
        }
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off"
    }
  }
);
