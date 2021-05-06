const { ESBuildMinifyPlugin } = require("esbuild-loader");
const { resolve } = require("path");

const target = "es2020";
const rootPath = resolve(__dirname, "..", "..");
const distPath = resolve(rootPath, "dist");
const srcPath = resolve(__dirname, "src");

module.exports = (_, options) =>
  /**@type {import('webpack').Configuration}*/
  ({
    experiments: { asyncWebAssembly: true },
    devtool: options.mode === "production" ? undefined : "source-map",
    context: rootPath,
    entry: resolve(srcPath, "extension.ts"),
    externals: {
      vscode: "commonjs vscode",
    },
    module: {
      rules: [
        {
          include: rootPath,
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
    resolve: {
      extensions: [".ts", ".js", ".tsx", ".jsx"],
    },
    target: "node",
  });
