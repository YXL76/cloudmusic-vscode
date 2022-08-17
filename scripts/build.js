// @ts-check

const { readdir, stat } = require("fs/promises");
const { build } = require("esbuild");
const { resolve } = require("path");
const { spawn } = require("child_process");
const { wasmLoader } = require("esbuild-plugin-wasm");

const prod = process.argv.includes("--prod");

const nodeTarget = "node16.13";
const browserTarget = "chrome98";

const rootPath = resolve(__dirname, "..");
const distPath = resolve(rootPath, "dist");
const pkgsPath = resolve(rootPath, "packages");

/**@type {import('esbuild').BuildOptions}*/
const globalSharedConfig = {
  sourcemap: false,
  legalComments: "none",
  // sourceRoot: rootPath,
  format: "esm",
  target: nodeTarget,
  minify: prod,
  color: true,
  logLevel: "warning",

  bundle: true,
  platform: "node",
  loader: { ".ts": "ts", ".js": "js", ".tsx": "tsx", ".jsx": "jsx" },
  resolveExtensions: [".ts", ".js", ".tsx", ".jsx"],
  // incremental: true,
  plugins: [wasmLoader({ mode: "embedded" })],
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
        format: "cjs",
        target: browserTarget,

        outfile,
        banner: { js: "'use strict';" },
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
    format: "cjs",
    sourcemap: !prod,

    outfile: resolve(distPath, "extension.js"),
    banner: { js: "'use strict';" },
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

    outfile: resolve(distPath, "server.mjs"),
    banner: {
      js: `import{createRequire}from"module";const require=createRequire(import.meta.url);`,
    },
    tsconfig,
    entryPoints: [resolve(srcPath, "index.ts")],
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
      jsx: "automatic",

      splitting: true,
      target: browserTarget,
      platform: "browser",
      tsconfig,
      outdir: distPath,
      entryPoints: files.map((file) => resolve(entriesPath, file)),
    })
  );
}
