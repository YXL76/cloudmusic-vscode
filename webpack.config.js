const { readFileSync, readdirSync } = require("fs");
const { DefinePlugin } = require("webpack");
const { ESBuildMinifyPlugin } = require("esbuild-loader");
const { resolve } = require("path");
const { transformSync } = require("esbuild");

const target = "es2019";
const distPath = resolve(__dirname, "dist");
const srcPath = resolve(__dirname, "src");

const scriptsPath = resolve(srcPath, "webview", "scripts");
const definitions = {};
readdirSync(scriptsPath).forEach(
  (file) =>
    file.substr(file.indexOf(".") + 1) === "ts" &&
    (definitions[file.substr(0, file.indexOf("."))] = `\`${
      transformSync(readFileSync(resolve(scriptsPath, file)).toString(), {
        loader: "ts",
        target: "chrome87",
        sourcemap: false,
        minify: true,
      }).code
    }\``)
);

module.exports = (_, options) =>
  /**@type {import('webpack').Configuration}*/
  ({
    experiments: { asyncWebAssembly: true },
    devtool: "source-map",
    entry: resolve(srcPath, "extension.ts"),
    externals: {
      vscode: "commonjs vscode",
    },
    module: {
      rules: [
        {
          exclude: /node_modules/,
          include: resolve(srcPath),
          loader: "esbuild-loader",
          options: {
            loader: "tsx",
            target,
            tsconfigRaw: require(resolve(__dirname, "tsconfig.json")),
          },
          test: /\.tsx?$/,
        },
      ],
    },
    optimization: {
      minimize: options.mode === "production",
      minimizer:
        options.mode === "production"
          ? [new ESBuildMinifyPlugin({ target })]
          : [],
    },
    output: {
      devtoolModuleFilenameTemplate: "../[resource-path]",
      filename: "extension.js",
      libraryTarget: "commonjs2",
      path: distPath,
    },
    performance: {
      hints: false,
    },
    plugins: [new DefinePlugin(definitions)],
    resolve: {
      extensions: [".ts", ".js", ".tsx", ".jsx"],
    },
    target: "node",
  });
