// @ts-check

const { build } = require("esbuild");
const { resolve } = require("path");
const { pnpPlugin } = require("@yarnpkg/esbuild-plugin-pnp");

const prod = process.argv.includes("--prod");

const nodeTarget = "es2020";
const browserTarget = "chrome89";

const rootPath = resolve(__dirname, "..");
const distPath = resolve(rootPath, "dist");
const pkgsPath = resolve(rootPath, "packages");

/**@type {import('esbuild').BuildOptions}*/
const globalSharedConfig = {
  legalComments: "none",
  sourceRoot: rootPath,
  color: true,
  logLevel: "warning",

  bundle: true,
  loader: {
    ".ts": "ts",
    ".js": "js",
    ".tsx": "tsx",
    ".jsx": "jsx",
    ".css": "css",
  },
  resolveExtensions: [".ts", ".js", ".tsx", ".jsx", ".css"],
  // incremental: true,
  plugins: [pnpPlugin()],
};

// css
build({
  ...globalSharedConfig,
  sourcemap: false,
  target: browserTarget,
  minify: true,

  outfile: resolve(distPath, "style.css"),
  platform: "browser",
  allowOverwrite: true,
  entryPoints: [resolve(distPath, "style.css")],
});

// client
{
  const srcPath = resolve(pkgsPath, "client", "src");
  const tsconfig = resolve(pkgsPath, "client", "tsconfig.json");

  build({
    ...globalSharedConfig,
    sourcemap: !prod,
    format: "cjs",
    target: nodeTarget,
    minify: prod,

    outfile: resolve(distPath, "extension.js"),
    platform: "node",
    external: ["vscode"],
    tsconfig,
    entryPoints: [resolve(srcPath, "extension.ts")],
  });
}

// server
{
  const srcPath = resolve(pkgsPath, "server", "src");
  const tsconfig = resolve(pkgsPath, "server", "tsconfig.json");

  build({
    ...globalSharedConfig,
    sourcemap: !prod,
    format: "cjs",
    target: nodeTarget,
    minify: prod,

    outfile: resolve(distPath, "server.js"),
    platform: "node",
    external: ["vscode"],
    tsconfig,
    entryPoints: [resolve(srcPath, "init.ts")],
  });
}

//webview
{
  const srcPath = resolve(pkgsPath, "webview", "src");
  const tsconfig = resolve(pkgsPath, "webview", "tsconfig.json");

  /**@type {import('esbuild').BuildOptions}*/
  const sharedConfig = {
    ...globalSharedConfig,
    sourcemap: false,
    format: "esm",
    target: browserTarget,
    minify: prod,
    platform: "browser",
    tsconfig,
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
}
