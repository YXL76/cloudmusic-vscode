import { VOLUME_KEY, playerMode } from "../constant";
import { arch, platform } from "os";
import type { ExtensionContext } from "vscode";
import { IPC } from "../utils";

const available = [
  "win32-arm64.node",
  "darwin-x86.node",
  "linux-x86.node",
  "win32-x86.node",
];

export function initPlayer(context: ExtensionContext): void {
  const name = `${platform()}-${arch() === "x64" ? "x86" : arch()}.node`;
  const wasm = playerMode === "wasm" || !available.includes(name);
  console.log("Cloudmusic:", playerMode, "mode.");
  IPC.init(context.globalState.get(VOLUME_KEY, 85), { wasm, name });
}
