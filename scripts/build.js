// @ts-check

const { build } = require("esbuild");
const { pnpPlugin } = require("@yarnpkg/esbuild-plugin-pnp");
const { readdir } = require("fs/promises");
const { resolve } = require("path");

const prod = process.argv.includes("--prod");

const nodeTarget = "es2020";
const browserTarget = "chrome89";

const rootPath = resolve(__dirname, "..");
const distPath = resolve(rootPath, "dist");
const pkgsPath = resolve(rootPath, "packages");

/**@type {import('@yarnpkg/esbuild-plugin-pnp').PluginOptions["onResolve"]}*/
const onResolve = (args, { resolvedPath, error }) => {
  if (resolvedPath !== null) {
    return Promise.resolve({ /* namespace: `pnp`, */ path: resolvedPath });
  }

  const problems = error ? [{ text: error.message }] : [];
  // Sometimes dynamic resolve calls might be wrapped in a try / catch,
  // but ESBuild neither skips them nor does it provide a way for us to tell.
  // Because of that, we downgrade all errors to warnings in these situations.
  // Issue: https://github.com/evanw/esbuild/issues/1127
  switch (args.kind) {
    case `require-call`:
    case `require-resolve`:
    case `dynamic-import`:
      return Promise.resolve({ external: true, warnings: problems });
    default:
      return Promise.resolve({ external: true, errors: problems });
  }
};

/**@type {import('esbuild').BuildOptions}*/
const globalSharedConfig = {
  sourcemap: false,
  legalComments: "none",
  // sourceRoot: rootPath,
  color: true,
  logLevel: "warning",

  bundle: true,
  loader: { ".ts": "ts", ".js": "js", ".tsx": "tsx", ".jsx": "jsx" },
  resolveExtensions: [".ts", ".js", ".tsx", ".jsx"],
  // incremental: true,
  plugins: [pnpPlugin({ onResolve })],
};

// css
build({
  ...globalSharedConfig,
  target: browserTarget,
  minify: prod,

  outfile: resolve(distPath, "style.css"),
  platform: "browser",
  allowOverwrite: true,
  loader: { ".css": "css" },
  resolveExtensions: [".css"],
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
  const entriesPath = resolve(srcPath, "entries");
  const tsconfig = resolve(pkgsPath, "webview", "tsconfig.json");

  readdir(entriesPath).then((files) =>
    build({
      ...globalSharedConfig,
      splitting: true,
      format: "esm",
      target: browserTarget,
      minify: prod,
      platform: "browser",
      tsconfig,
      outdir: distPath,
      entryPoints: files.map((file) => resolve(entriesPath, file)),
    })
  );
}
