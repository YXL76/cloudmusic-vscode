// @ts-check

/**
 * @type {Partial<import('eslint').Linter.RulesRecord>}
 */
const baseNodeTsRules = {
  "@typescript-eslint/consistent-type-imports": "warn",
  "@typescript-eslint/lines-between-class-members": "error",
  "@typescript-eslint/member-ordering": "warn",
  "@typescript-eslint/naming-convention": "warn",
  "@typescript-eslint/semi": "warn",
  "no-empty": ["error", { allowEmptyCatch: true }],
};

/**
 * @param {string} files -
 * @param {string} project -
 * @returns {import('eslint').Linter.ConfigOverride} -
 */
const nodeTsConfig = (files, project) => ({
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:prettier/recommended",
  ],
  files,
  parserOptions: {
    ecmaVersion: 10,
    project: `${__dirname}${project}`,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "prettier"],
  rules: baseNodeTsRules,
});

/**
 * @param {string} files -
 * @param {string} project -
 * @returns {import('eslint').Linter.ConfigOverride} -
 */
const browserTsConfig = (files, project) => ({
  env: { browser: true, node: false },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:prettier/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  files,
  parserOptions: {
    ecmaVersion: 10,
    project: `${__dirname}${project}`,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "prettier", "react"],
  rules: {
    ...baseNodeTsRules,
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off",
  },
  settings: { react: { version: "17.0" } },
});

/**@type {import('eslint').Linter.Config}*/
const config = {
  env: { browser: false, node: true },
  extends: ["eslint:recommended", "plugin:prettier/recommended"],
  ignorePatterns: ["/packages/wasi/**/*.*", "/packages/wasm/**/*.*", "/scripts/**/*.*", "*.json"],
  parser: "@typescript-eslint/parser",
  plugins: ["prettier"],
  rules: {
    curly: "warn",
    eqeqeq: "warn",
    "no-empty": ["error", { allowEmptyCatch: true }],
    "no-throw-literal": "warn",
    semi: "warn",
    "sort-imports": [
      "warn",
      {
        allowSeparatedGroups: false,
        ignoreCase: false,
        ignoreDeclarationSort: false,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
      },
    ],
  },
  overrides: [
    nodeTsConfig("./packages/@types/**/*.ts", "/packages/@types/tsconfig.json"),
    nodeTsConfig("./packages/client/**/*.ts", "/packages/client/tsconfig.json"),
    nodeTsConfig("./packages/server/**/*.ts", "/packages/server/tsconfig.json"),
    nodeTsConfig("./packages/shared/**/*.ts", "/packages/shared/tsconfig.json"),
    browserTsConfig("./packages/webview/**/*.ts*", "/packages/webview/tsconfig.json"),
  ],
};

module.exports = config;
