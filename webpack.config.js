/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

"use strict";

const { join } = require("path");

/**@type {import('webpack').Configuration}*/
const config = {
  target: "node",
  entry: join(__dirname, "src", "extension.ts"),
  output: {
    path: join(__dirname, "dist"),
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
        loader: require.resolve("vscode-nls-dev/lib/webpack-loader"),
        options: {
          base: join(__dirname, "src"),
        },
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: require.resolve("ts-loader"),
      },
    ],
  },
};

module.exports = config;
