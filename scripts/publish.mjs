// @ts-check
// Reference: [Platform-specific extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#platformspecific-extensions)

import { basename, extname, resolve } from "node:path";
import { copyFileSync, mkdirSync, readdirSync, rmdirSync } from "node:fs";
import assert from "node:assert";
import packageJSON from "../package.json" assert { type: "json" };
import { spawnSync } from "node:child_process";

const vsceToken = process.env["VSCE_TOKEN"];
const ovsxToken = process.env["OVSX_TOKEN"];
assert(vsceToken, "Missing VSCE_TOKEN");
assert(ovsxToken, "Missing OVSX_TOKEN");

const rootPath = process.cwd();
const buildPath = resolve(rootPath, "build");
const artifactPath = resolve(rootPath, ".artifact", "build");
const mediaArtifactPath = resolve(rootPath, ".artifact", "media");

console.log(`Building extension version ${packageJSON.version}`);

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
// const vscodeTargets = new Set(Object.values(targetMap).flat());

const artifacts = readdirSync(artifactPath).map((name) => ({ name, base: basename(name, extname(name)) }));
const spawnConf = { cwd: rootPath, shell: false, windowsHide: true };

// [vscode:prepublish] replacement
spawnSync("yarn", ["build"], spawnConf);
console.log("Build complete");

// Publish
// Publish to Visual Studio Marketplace
const publishArgs = ["dlx", "-q", "vsce", "publish", "--no-dependencies", "-p", vsceToken, "--target"];

// Publish native
for (const { name, base } of artifacts) {
  nodeTargets.delete(base);
  mkdirSync(buildPath, { recursive: true });
  copyFileSync(resolve(artifactPath, name), resolve(buildPath, name));

  if (base.startsWith("darwin-")) {
    const name = `${base}-media`;
    copyFileSync(resolve(mediaArtifactPath, name), resolve(buildPath, name));
  }

  for (const target of targetMap[base]) {
    let { stdout, stderr } = spawnSync("yarn", [...publishArgs, target], spawnConf);
    console.log(stdout.toString(), stderr.toString());
  }

  rmdirSync(buildPath, { recursive: true });
}
console.log("Native extension published");

// Publish wasm
for (const nodeTarget of nodeTargets) {
  for (const target of targetMap[nodeTarget]) {
    let { stdout, stderr } = spawnSync("yarn", [...publishArgs, target], spawnConf);
    console.log(stdout.toString(), stderr.toString());
  }
}
console.log("WASM extension published");

// Clean up
/* for (const target of vscodeTargets) {
  const file = resolve(rootPath, `cloudmusic-${target}-${version}.vsix`);
  rm(file, { force: true, recursive: true });
}
console.log("Cleaned up"); */

// Publish to Open VSX Registry
mkdirSync(buildPath, { recursive: true });
for (const { name } of artifacts) {
  copyFileSync(resolve(artifactPath, name), resolve(buildPath, name));
}
spawnSync("yarn", ["dlx", "-q", "vsce", "package", "--no-dependencies"], spawnConf);
const vsix = `cloudmusic-${packageJSON.version}.vsix`;
let { stdout, stderr } = spawnSync("yarn", ["dlx", "-q", "ovsx", "publish", vsix, "-p", ovsxToken], spawnConf);
// skip the error
console.log(stdout.toString(), stderr.toString());
