// @ts-check

const { build } = require("esbuild");
const { pnpPlugin } = require("@yarnpkg/esbuild-plugin-pnp");
const { resolve } = require("path");
const { fork } = require("child_process");

const browserTarget = "chrome89";
const rootPath = resolve(__dirname, "..");
const pkgsPath = resolve(rootPath, "packages");

const srcPath = resolve(pkgsPath, "webview", "src");
const filePath = resolve(srcPath, "tooltip.tsx");
const outputPath = resolve(srcPath, "tooltip.js");
const tsconfig = resolve(pkgsPath, "webview", "tsconfig.json");

/**@type {import('esbuild').BuildOptions}*/
const config = {
  sourcemap: false,
  legalComments: "none",
  format: "cjs",
  minify: true,
  color: true,
  logLevel: "warning",

  bundle: true,
  platform: "browser",
  loader: { ".ts": "ts", ".js": "js", ".tsx": "tsx", ".jsx": "jsx" },
  resolveExtensions: [".ts", ".js", ".tsx", ".jsx"],
  target: browserTarget,
  tsconfig,
  outdir: srcPath,
  entryPoints: [filePath],
  plugins: [pnpPlugin()],
};

build(config)
  .then(() => fork(outputPath))
  .catch(console.error);
