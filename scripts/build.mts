import type { BuildOptions, Plugin } from "https://deno.land/x/esbuild@v0.21.4/mod.js";
import { build, stop } from "https://deno.land/x/esbuild@v0.21.4/mod.js";
import { dirname, isAbsolute, join, resolve } from "https://deno.land/std@0.224.0/path/mod.ts";

const prod = Deno.args.includes("--prod");

const nodeTarget = "node16.13";
const browserTarget = "chrome98";

const rootPath = Deno.cwd();
const distPath = resolve(rootPath, "dist");
const pkgsPath = resolve(rootPath, "packages");

async function generateWasmModule(path: string) {
  function generateWasmImports(wasmImports: WebAssembly.ModuleImportDescriptor[]) {
    const jsImports = new Map<string, string[]>();
    for (const wasmImport of wasmImports) {
      const jsImport = jsImports.get(wasmImport.module);
      if (jsImport) jsImport.push(wasmImport.name);
      else jsImports.set(wasmImport.module, [wasmImport.name]);
    }

    const imports = [...jsImports].map(([module, imports]) => [JSON.stringify(module), imports] as const);
    return `${imports.map(([module, imports]) => `import { ${imports.join(", ")} } from ${module};`).join("\n")}
  const imports = {${imports.map(([m, i]) => `[${m}]: { ${i.join(",\n")} }`).join(",\n")}};`;
  }

  const module = await WebAssembly.compile(await Deno.readFile(path));
  const imports = WebAssembly.Module.imports(module);
  const exports = WebAssembly.Module.exports(module);

  return `import wasmModule from ${JSON.stringify(path)};
${generateWasmImports(imports)}
export const { instance } = await WebAssembly.instantiate(wasmModule, imports);
${exports.map(({ name }) => `export const ${name} = instance.exports.${name};`).join("\n")}
`;
}

const WASM_MODULE_NAMESPACE = "wasm-module";
const WASM_EMBEDDED_NAMESPACE = "wasm-embedded";
// https://github.com/Tschrock/esbuild-plugin-wasm
const wasmLoader: Plugin = {
  name: "wasm",
  setup(build) {
    build.onResolve({ filter: /\.(?:wasm)$/ }, ({ path, namespace, resolveDir }) => {
      if (namespace === WASM_MODULE_NAMESPACE) return { path, namespace: WASM_EMBEDDED_NAMESPACE };
      if (resolveDir === "") return;
      return { path: isAbsolute(path) ? path : join(resolveDir, path), namespace: WASM_MODULE_NAMESPACE };
    });

    build.onLoad({ filter: /.*/, namespace: WASM_MODULE_NAMESPACE }, async ({ path }) => ({
      contents: await generateWasmModule(path),
      resolveDir: dirname(path),
    }));

    build.onLoad({ filter: /.*/, namespace: WASM_EMBEDDED_NAMESPACE }, async ({ path }) => ({
      contents: await Deno.readFile(path),
      loader: "binary",
    }));
  },
};

const globalSharedConfig: BuildOptions = {
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
  plugins: [wasmLoader],
};

const cssOutput = resolve(distPath, "style.css");
const entriesPath = resolve(pkgsPath, "webview", "src", "entries");

await Promise.all([
  // css
  Deno.stat(cssOutput)
    .catch(() => Deno.run({ cmd: ["yarn", "generate-css"] }).status())
    .then(() =>
      build({
        ...globalSharedConfig,

        target: browserTarget,
        outfile: cssOutput,
        platform: "browser",
        allowOverwrite: true,
        loader: { ".css": "css" },
        resolveExtensions: [".css"],
        entryPoints: [cssOutput],
      })
    ),

  // client
  build({
    ...globalSharedConfig,
    format: "cjs",
    sourcemap: !prod,

    outfile: resolve(distPath, "extension.js"),
    banner: { js: "'use strict';" },
    external: ["vscode"],
    tsconfig: resolve(pkgsPath, "client", "tsconfig.json"),
    entryPoints: [resolve(pkgsPath, "client", "src", "extension.ts")],
  }),

  // server
  build({
    ...globalSharedConfig,

    outfile: resolve(distPath, "server.mjs"),
    banner: { js: `import{createRequire}from"module";const require=createRequire(import.meta.url);` },
    tsconfig: resolve(pkgsPath, "server", "tsconfig.json"),
    entryPoints: [resolve(pkgsPath, "server", "src", "index.ts")],
  }),

  // webview
  build({
    ...globalSharedConfig,
    jsx: "automatic",

    splitting: true,
    target: browserTarget,
    platform: "browser",
    tsconfig: resolve(pkgsPath, "webview", "tsconfig.json"),
    outdir: distPath,
    entryPoints: [...Deno.readDirSync(entriesPath)].map(({ name }) => resolve(entriesPath, name)),
  }),
]);

stop();
