const { ESBuildPlugin, ESBuildMinifyPlugin } = require("esbuild-loader");
const { readFileSync, readdirSync } = require("fs");
const { DefinePlugin } = require("webpack");
const ESLintPlugin = require("eslint-webpack-plugin");
const { resolve } = require("path");
const { transformSync } = require("esbuild");

const target = "es2019";
const distPath = resolve(__dirname, "dist");
const srcPath = resolve(__dirname, "src");

const scriptsPath = resolve(srcPath, "webview", "scripts");
const definitions = {};
readdirSync(scriptsPath).map(
  (file) =>
    (definitions[file.substr(0, file.lastIndexOf("."))] = `\`${
      transformSync(readFileSync(resolve(scriptsPath, file)).toString(), {
        sourcemap: false,
        minify: true,
        minifyWhitespace: true,
        minifyIdentifiers: true,
        minifySyntax: true,
      }).code
    }\``)
);

module.exports = (_, options) =>
  /**@type {import('webpack').Configuration}*/
  ({
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
    plugins: [
      new DefinePlugin(definitions),
      new ESBuildPlugin(),
      new ESLintPlugin({
        emitError: true,
        emitWarning: true,
        extensions: ["ts", "tsx"],
        fix: true,
      }),
    ],
    resolve: {
      extensions: [".ts", ".js", ".tsx", ".jsx"],
      alias: {
        react: "preact/compat",
        "react-dom": "preact/compat",
        "react-dom/test-utils": "preact/test-utils",
      },
    },
    target: "node",
  });
