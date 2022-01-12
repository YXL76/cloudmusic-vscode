// @ts-check
// Reference: [Platform-specific extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#platformspecific-extensions)

const {
  mkdirSync,
  readdirSync,
  copyFileSync,
  rmdirSync,
  readFileSync,
} = require("fs");
const { resolve, basename, extname } = require("path");
const { spawnSync } = require("child_process");
const { rm } = require("fs/promises");

const rootPath = resolve(__dirname, "..");
const buildPath = resolve(rootPath, "build");
const artifactPath = resolve(rootPath, ".artifact", "build");

const { version } = JSON.parse(
  readFileSync(resolve(rootPath, "package.json"), "utf8")
);

const targetMap = {
  // [Node target]: [VS Code target]
  "win32-x64": ["win32-x64"],
  "win32-ia32": ["win32-ia32"],
  "win32-arm64": ["win32-arm64"],
  "linux-x64": ["linux-x64", "alpine-x64"],
  "linux-arm64": ["linux-arm64", "alpine-arm64"],
  "linux-arm": ["linux-armhf"],
  "darwin-x64": ["darwin-x64"],
  "darwin-arm64": ["darwin-arm64"],
};
const nodeTargets = new Set(Object.keys(targetMap));
const vscodeTargets = new Set(Object.values(targetMap).flat());

const artifacts = readdirSync(artifactPath).map((name) => {
  const ext = extname(name);
  return { name, base: basename(name, ext), ext };
});
const spawnConf = { cwd: rootPath, shell: false, windowsHide: true };

// [vscode:prepublish] replacement
spawnSync("yarn", ["build"], spawnConf);

// Install vsce
spawnSync("yarn", ["add", "vsce"], spawnConf);

// Package
const pkgArgs = ["vsce", "package", "--no-dependencies", "--target"];

// Package native
for (const { name, base } of artifacts) {
  nodeTargets.delete(base);
  mkdirSync(buildPath, { recursive: true });
  copyFileSync(resolve(artifactPath, name), resolve(buildPath, name));

  for (const target of targetMap[base]) {
    let res = spawnSync("yarn", [...pkgArgs, target], spawnConf);
    if (res.error) {
      throw res.error;
    }
  }

  rmdirSync(buildPath, { recursive: true });
}

// Package wasm
for (const nodeTarget of nodeTargets) {
  for (const target of targetMap[nodeTarget]) {
    let res = spawnSync("yarn", [...pkgArgs, target], spawnConf);
    if (res.error) {
      throw res.error;
    }
  }
}

// Publish
// Publish to Visual Studio Marketplace
for (const target of vscodeTargets) {
  const file = resolve(rootPath, `cloudmusic-${target}-${version}.vsix`);
  let res = spawnSync(
    "yarn",
    [
      "vsce",
      "publish",
      "--no-dependencies",
      "--packagePath",
      file,
      "-p",
      process.env["VSCE_TOKEN"],
    ],
    spawnConf
  );
  if (res.error) {
    throw res.error;
  }
  rm(file, { force: true, recursive: true });
}

// Publish to Open VSX Registry
mkdirSync(buildPath, { recursive: true });
for (const { name } of artifacts) {
  copyFileSync(resolve(artifactPath, name), resolve(buildPath, name));
}
pkgArgs.pop();
spawnSync("yarn", pkgArgs, spawnConf);
// skip the error
console.error(
  spawnSync(
    "yarn",
    [
      "dlx",
      "ovsx",
      "publish",
      `cloudmusic-${version}.vsix`,
      "-p",
      process.env["OVSX_TOKEN"],
    ],
    spawnConf
  ).error
);
