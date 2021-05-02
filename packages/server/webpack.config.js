const { ESBuildMinifyPlugin } = require("esbuild-loader");
const { resolve } = require("path");

const target = "es2019";
const rootPath = resolve(__dirname, "..", "..");
const distPath = resolve(rootPath, "dist");
const srcPath = resolve(__dirname, "src");

module.exports = (_, options) =>
  /**@type {import('webpack').Configuration}*/
  ({
    experiments: { asyncWebAssembly: true },
    devtool: "source-map",
    context: rootPath,
    entry: resolve(srcPath, "server.ts"),
    module: {
      rules: [
        {
          exclude: /node_modules/,
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
