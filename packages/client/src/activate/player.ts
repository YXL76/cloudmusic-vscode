import { PLAYER_MODE, VOLUME_KEY } from "../constant";
import { arch, platform } from "os";
import type { ExtensionContext } from "vscode";
import { IPC } from "../utils";

type NativeModule = `${NodeJS.Platform}-${string}.node`;

const available: NativeModule[] = [
  "linux-arm.node",
  "darwin-arm64.node",
  "linux-arm64.node",
  "win32-arm64.node",
  "darwin-x64.node",
  "linux-x64.node",
  "win32-x64.node",
];

export function initPlayer(context: ExtensionContext): void {
  const name: NativeModule = `${platform()}-${arch()}.node`;
  const wasm = PLAYER_MODE === "wasm" || !available.includes(name);
  console.log("Cloudmusic:", PLAYER_MODE, "mode.");
  IPC.init(context.globalState.get(VOLUME_KEY, 85), { wasm, name });
}
