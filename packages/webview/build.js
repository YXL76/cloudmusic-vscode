// @ts-check

const { build } = require("esbuild");
const { resolve } = require("path");
const { pnpPlugin } = require("@yarnpkg/esbuild-plugin-pnp");

const target = "chrome89";
const prod = process.argv.includes("--prod");

const rootPath = resolve(__dirname, "..", "..");
const distPath = resolve(rootPath, "dist");
const srcPath = resolve(__dirname, "src");

const tsconfig = resolve(__dirname, "tsconfig.json");

/**@type {import('esbuild').BuildOptions}*/
const sharedConfig = {
  sourcemap: false,
  legalComments: "none",
  sourceRoot: rootPath,
  format: "esm",
  target,
  minify: prod,
  color: true,
  logLevel: "warning",

  bundle: true,
  platform: "browser",
  loader: { ".ts": "ts", ".js": "js", ".tsx": "tsx", ".jsx": "jsx" },
  resolveExtensions: [".ts", ".js", ".tsx", ".jsx"],
  tsconfig,
  // incremental: true,
  plugins: [pnpPlugin()],
};

build({
  ...sharedConfig,
  outfile: resolve(distPath, "webview.js"),
  entryPoints: [resolve(srcPath, "index.tsx")],
});

build({
  ...sharedConfig,
  outfile: resolve(distPath, "provider.js"),
  entryPoints: [resolve(srcPath, "provider.ts")],
});
