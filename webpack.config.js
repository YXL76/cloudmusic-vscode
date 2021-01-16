const { ESBuildPlugin, ESBuildMinifyPlugin } = require("esbuild-loader");
const CopyPlugin = require("copy-webpack-plugin");
const { resolve } = require("path");

const antdPath = resolve(__dirname, "node_modules", "antd", "dist");
const distPath = resolve(__dirname, "dist");
const srcPath = resolve(__dirname, "src");

module.exports = (_, options) => {
  /**@type {import('webpack').Configuration}*/
  const baseConfig = {
    performance: {
      hints: false,
    },
    optimization: {
      minimize: true,
      minimizer:
        options.mode === "production"
          ? [new ESBuildMinifyPlugin({ target: "es2019" })]
          : [],
    },
    devtool: "source-map",
    externals: {
      vscode: "commonjs vscode",
    },
    resolve: {
      extensions: [".ts", ".js", ".tsx", ".jsx"],
    },
  };

  /**@type {import('webpack').Configuration}*/
  const extensionConfig = {
    ...baseConfig,
    target: "node",
    entry: resolve(srcPath, "extension.ts"),
    output: {
      path: distPath,
      filename: "extension.js",
      libraryTarget: "commonjs2",
      devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          include: resolve(srcPath),
          exclude: /node_modules/,
          loader: "esbuild-loader",
          options: {
            loader: "ts",
            target: "es2019",
            tsconfigRaw: require(resolve(__dirname, "tsconfig.json")),
          },
        },
      ],
    },
    plugins: [new ESBuildPlugin()],
  };

  /**@type {import('webpack').Configuration}*/
  const webviewConfig = {
    ...baseConfig,
    // target: "node",
    entry: resolve(srcPath, "webview", "index.tsx"),
    output: {
      path: distPath,
      filename: "webview.js",
      devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          loader: "esbuild-loader",
          options: {
            loader: "tsx",
            target: "chrome83",
            tsconfigRaw: require(resolve(srcPath, "webview", "tsconfig.json")),
          },
        },
      ],
    },
    plugins: [
      new ESBuildPlugin(),
      new CopyPlugin({
        patterns: [
          {
            from: resolve(antdPath, "antd.min.css"),
            to: distPath,
          },
          {
            from: resolve(antdPath, "antd.dark.min.css"),
            to: distPath,
          },
        ],
      }),
    ],
  };

  return [extensionConfig, webviewConfig];
};
