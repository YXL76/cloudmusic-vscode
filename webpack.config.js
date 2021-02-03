const { ESBuildPlugin, ESBuildMinifyPlugin } = require("esbuild-loader");
const ESLintPlugin = require("eslint-webpack-plugin");
const { resolve } = require("path");

const distPath = resolve(__dirname, "dist");
const srcPath = resolve(__dirname, "src");

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
            target: "es2019",
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
          ? [new ESBuildMinifyPlugin({ target: "es2019" })]
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
