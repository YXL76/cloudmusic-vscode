// Reference: [Platform-specific extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#platformspecific-extensions)

import { basename, extname, resolve } from "https://deno.land/std@0.224.0/path/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import packageJSON from "../package.json" assert { type: "json" };

const vsceToken = Deno.env.get("VSCE_TOKEN");
const ovsxToken = Deno.env.get("OVSX_TOKEN");
assert(vsceToken, "Missing VSCE_TOKEN");
assert(ovsxToken, "Missing OVSX_TOKEN");

const rootPath = Deno.cwd();
const buildPath = resolve(rootPath, "build");
const artifactPath = resolve(rootPath, ".artifact", "build");
const mediaArtifactPath = resolve(rootPath, ".artifact", "media");

console.log(`Building extension version ${packageJSON.version}`);

const targetMap = {
  // [Node target]: [VS Code target]
  "win32-x64": ["win32-x64"],
  // "win32-ia32": ["win32-ia32"],
  "win32-arm64": ["win32-arm64"],
  "linux-x64": ["linux-x64", "alpine-x64"],
  "linux-arm64": ["linux-arm64", "alpine-arm64"],
  "linux-arm": ["linux-armhf"],
  "darwin-x64": ["darwin-x64"],
  "darwin-arm64": ["darwin-arm64"],
} as const;
const nodeTargets = new Set(Object.keys(targetMap) as (keyof typeof targetMap)[]);
// const vscodeTargets = new Set(Object.values(targetMap).flat());

const artifacts: { name: string; base: keyof typeof targetMap }[] = [];
for await (const { name } of Deno.readDir(artifactPath)) {
  const base = basename(name, extname(name));
  if (
    base === "win32-x64" ||
    base === "win32-ia32" ||
    base === "win32-arm64" ||
    base === "linux-x64" ||
    base === "linux-arm64" ||
    base === "linux-arm" ||
    base === "darwin-x64" ||
    base === "darwin-arm64"
  ) {
    artifacts.push({ name, base });
  }
}

// [vscode:prepublish] replacement
await Deno.run({ cmd: ["yarn", "build"] }).status();
console.log("Build complete");

// Publish
// Publish to Visual Studio Marketplace
const publishArgs = ["yarn", "dlx", "-q", "@vscode/vsce", "publish", "--no-dependencies", "--skip-duplicate", "-p", vsceToken, "--target"];
const decoder = new TextDecoder();

// Publish native
for (const { name, base } of artifacts) {
  nodeTargets.delete(base);
  await Deno.mkdir(buildPath, { recursive: true });
  await Deno.copyFile(resolve(artifactPath, name), resolve(buildPath, name));

  if (base.startsWith("darwin-")) {
    const name = `${base}-media`;
    await Deno.copyFile(resolve(mediaArtifactPath, name), resolve(buildPath, name));
  }

  for (const target of targetMap[base]) {
    const p = Deno.run({ cmd: [...publishArgs, target], stdout: "piped", stderr: "piped" });
    const [status, stdout, stderr] = await Promise.all([p.status(), p.output(), p.stderrOutput()]);
    assert(status.success, `Failed to publish ${target}`);
    console.log(decoder.decode(stdout), decoder.decode(stderr));
  }

  await Deno.remove(buildPath, { recursive: true });
}
console.log("Native extension published");

// Publish wasm
for (const nodeTarget of nodeTargets) {
  for (const target of targetMap[nodeTarget]) {
    try {
      const p = Deno.run({ cmd: [...publishArgs, target], stdout: "piped", stderr: "piped" });
      const status = await p.status();
      assert(status.success, `Failed to publish ${target}`);
    } catch {
      const p = Deno.run({ cmd: [...publishArgs, target], stdout: "piped", stderr: "piped" });
      const [status, stdout, stderr] = await Promise.all([p.status(), p.output(), p.stderrOutput()]);
      assert(status.success, `Failed to publish ${target}`);
      console.log(decoder.decode(stdout), decoder.decode(stderr));
    }
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
await Deno.mkdir(buildPath, { recursive: true });
await Promise.all(artifacts.map(({ name }) => Deno.copyFile(resolve(artifactPath, name), resolve(buildPath, name))));

assert(
  (await Deno.run({ cmd: ["yarn", "dlx", "-q", "@vscode/vsce", "package", "--no-dependencies"] }).status()).success,
  "Failed to package ",
);
const vsix = `cloudmusic-${packageJSON.version}.vsix`;
const p = Deno.run({
  cmd: ["yarn", "dlx", "-q", "ovsx", "publish", vsix, "-p", ovsxToken],
  stdout: "piped",
  stderr: "piped",
});
const [status, stdout, stderr] = await Promise.all([p.status(), p.output(), p.stderrOutput()]);
// skip the error
if (status.success) console.log(decoder.decode(stdout), decoder.decode(stderr));
