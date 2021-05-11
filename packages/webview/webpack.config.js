const { ESBuildMinifyPlugin } = require("esbuild-loader");
const { resolve } = require("path");

const target = "chrome89";
const rootPath = resolve(__dirname, "..", "..");
const distPath = resolve(rootPath, "dist");
const srcPath = resolve(__dirname, "src");

module.exports = (_, options) =>
  /**@type {import('webpack').Configuration[]}*/
  ([
    {
      experiments: { asyncWebAssembly: true, outputModule: true },
      // devtool: options.mode === "production" ? undefined : "source-map",
      context: rootPath,
      entry: resolve(srcPath, "index.tsx"),
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
          {
            include: rootPath,
            loader: "esbuild-loader",
            options: {
              loader: "tsx",
              target,
              tsconfigRaw: require(resolve(__dirname, "tsconfig.json")),
            },
            test: /\.tsx$/,
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
        filename: "webview.js",
        libraryTarget: "module",
        path: distPath,
      },
      performance: {
        hints: false,
      },
      resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
      },
      target: "web",
    },
    {
      experiments: { asyncWebAssembly: true, outputModule: true },
      // devtool: options.mode === "production" ? undefined : "source-map",
      context: rootPath,
      entry: resolve(srcPath, "provider.ts"),
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
        filename: "provider.js",
        libraryTarget: "module",
        path: distPath,
      },
      performance: {
        hints: false,
      },
      resolve: {
        extensions: [".ts", ".js"],
      },
      target: "web",
    },
  ]);
