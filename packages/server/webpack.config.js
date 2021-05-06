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
    // devtool: options.mode === "production" ? undefined : "source-map",
    context: rootPath,
    entry: resolve(srcPath, "server.ts"),
    module: {
      rules: [
        {
          include: rootPath,
          loader: "esbuild-loader",
          options: {
            loader: "ts",
            target,
            tsconfigRaw: require(resolve(__dirname, "tsconfig.json")),
          },
          test: /\.ts$/,
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
      filename: "server.js",
      libraryTarget: "commonjs2",
      path: distPath,
    },
    performance: {
      hints: false,
    },
    resolve: {
      extensions: [".ts", ".js"],
    },
    target: "node",
  });
