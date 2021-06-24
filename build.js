// @ts-check

const { build } = require("esbuild");
const { resolve } = require("path");

const distPath = resolve(__dirname, "dist");

build({
  sourcemap: false,
  legalComments: "none",
  target: "chrome89",
  minify: true,
  color: true,
  logLevel: "warning",

  bundle: true,
  outfile: resolve(distPath, "style.css"),
  platform: "browser",
  loader: { ".css": "css" },
  resolveExtensions: [".css"],
  allowOverwrite: true,
  entryPoints: [resolve(distPath, "style.css")],
});
