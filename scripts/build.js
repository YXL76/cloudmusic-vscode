// @ts-check

const { readdir, stat } = require("fs/promises");
const { build } = require("esbuild");
const { pnpPlugin } = require("@yarnpkg/esbuild-plugin-pnp");
const { resolve } = require("path");
const { spawn } = require("child_process");
const { wasmLoader } = require("esbuild-plugin-wasm");

const prod = process.argv.includes("--prod");

const nodeTarget = "node16.13";
const browserTarget = "chrome98";

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
  format: "cjs",
  target: nodeTarget,
  minify: prod,
  color: true,
  logLevel: "warning",

  bundle: true,
  platform: "node",
  loader: { ".ts": "ts", ".js": "js", ".tsx": "tsx", ".jsx": "jsx" },
  resolveExtensions: [".ts", ".js", ".tsx", ".jsx"],
  banner: { js: "'use strict';" },
  // incremental: true,
  plugins: [wasmLoader({ mode: "embedded" }), pnpPlugin({ onResolve })],
};

// css
{
  const outfile = resolve(distPath, "style.css");
  stat(outfile)
    .catch(
      () =>
        new Promise((resolve, reject) =>
          spawn("yarn", ["generate-css"], {
            cwd: rootPath,
            shell: false,
            windowsHide: true,
          })
            .once("close", resolve)
            .once("error", reject)
        )
    )
    .then(() =>
      build({
        ...globalSharedConfig,
        target: browserTarget,

        outfile,
        platform: "browser",
        allowOverwrite: true,
        loader: { ".css": "css" },
        resolveExtensions: [".css"],
        entryPoints: [resolve(distPath, "style.css")],
      })
    );
}

// client
{
  const srcPath = resolve(pkgsPath, "client", "src");
  const tsconfig = resolve(pkgsPath, "client", "tsconfig.json");

  build({
    ...globalSharedConfig,
    sourcemap: !prod,

    outfile: resolve(distPath, "extension.js"),
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

    outfile: resolve(distPath, "server.js"),
    tsconfig,
    entryPoints: [resolve(srcPath, "init.ts")],
  });
}

// webview
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
      platform: "browser",
      tsconfig,
      outdir: distPath,
      entryPoints: files.map((file) => resolve(entriesPath, file)),
    })
  );
}
