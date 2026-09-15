import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".ui-review/**",
      "docs/examples/easy-ui/**",
    ],
  },
  {
    files: ["**/*.mjs", "**/*.jsx", "docs/examples/*.js", "docs/app/*.js"],
    ...js.configs.recommended,
    languageOptions: {
      globals: globals.node,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...js.configs.recommended.rules,
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-var": "error",
      "prefer-const": "error",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    // These modules contain functions serialized into Playwright's browser context.
    files: [
      "test/react/*.jsx",
      "docs/examples/*.js",
      "docs/app/*.js",
      "src/checks.mjs",
      "src/capture.mjs",
      "src/review.mjs",
    ],
    languageOptions: { globals: globals.browser },
  },
];
