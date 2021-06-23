// @ts-check

const { build } = require("esbuild");
const { resolve } = require("path");
const { pnpPlugin } = require("@yarnpkg/esbuild-plugin-pnp");

const target = "es2020";
const prod = process.argv.includes("--prod");

const rootPath = resolve(__dirname, "..", "..");
const distPath = resolve(rootPath, "dist");
const srcPath = resolve(__dirname, "src");

const tsconfig = resolve(__dirname, "tsconfig.json");

build({
  sourcemap: !prod,
  legalComments: "none",
  sourceRoot: rootPath,
  format: "cjs",
  target,
  minify: prod,
  color: true,
  logLevel: "warning",

  bundle: true,
  outfile: resolve(distPath, "extension.js"),
  platform: "node",
  external: ["vscode"],
  loader: { ".ts": "ts", ".js": "js", ".tsx": "tsx", ".jsx": "jsx" },
  resolveExtensions: [".ts", ".js", ".tsx", ".jsx"],
  tsconfig,
  // incremental: true,
  entryPoints: [resolve(srcPath, "extension.ts")],
  plugins: [pnpPlugin()],
});
