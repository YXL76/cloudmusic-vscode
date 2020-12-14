"use strict";

const { ESBuildPlugin } = require("esbuild-loader");
const { resolve } = require("path");

/**@type {import('webpack').Configuration}*/
const config = {
  target: "node",
  entry: resolve(__dirname, "src", "extension.ts"),
  output: {
    path: resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: "esbuild-loader",
        options: {
          loader: "tsx",
          target: "es2019",
          tsconfigRaw: require(resolve(__dirname, "src", "tsconfig.json")),
        },
      },
    ],
  },
  plugins: [new ESBuildPlugin()],
};

module.exports = [config];
