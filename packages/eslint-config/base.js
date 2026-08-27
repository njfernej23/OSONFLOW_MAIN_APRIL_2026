import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import turboPlugin from "eslint-plugin-turbo"
import tseslint from "typescript-eslint"

/**
 * Decides which rules actually fail a build.
 *
 * This repo previously loaded eslint-plugin-only-warn, which forces every
 * rule to severity "warn" the moment it is imported. `eslint` therefore
 * always exited 0 and `turbo lint` could never fail — which is how unused
 * files, exports, and dependencies accumulated unnoticed.
 *
 * Rather than a blanket downgrade, the rules currently being violated are
 * listed explicitly below. Today's debt stays visible as warnings without
 * blocking the build, while anything NOT on the list — no-unused-vars above
 * all — fails. Work an entry down to zero, then delete the line.
 *
 * This must be spread LAST in every derived config: next.js and
 * react-internal.js re-spread the recommended rulesets after the base, and
 * would otherwise reset these back to "error".
 *
 * @type {import("eslint").Linter.Config}
 */
export const severityPolicy = {
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],

    // Pre-existing debt: downgraded, not accepted.
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-expressions": "warn",
    "no-empty": "warn",
    "react/no-unescaped-entities": "warn",
    "react/jsx-no-comment-textnodes": "warn",
    "react-hooks/set-state-in-effect": "warn",
    "react-hooks/refs": "warn",
    "react-hooks/purity": "warn",
    "react-hooks/preserve-manual-memoization": "warn",
    "react-hooks/incompatible-library": "warn",
    "react-hooks/exhaustive-deps": "warn",
  },
}

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  severityPolicy,
  {
    // public/ holds shipped static assets, not application source.
    ignores: [
      "dist/**",
      ".next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "public/**",
    ],
  },
]
