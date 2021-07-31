import { arch, platform } from "os";
import { IPC } from "../utils";
import { isWasm } from "../constant";

const available = [
  "win32-arm64.node",
  "darwin-x86.node",
  "linux-x86.node",
  "win32-x86.node",
];

export function initPlayer(): void {
  const name = `${platform()}-${arch() === "x64" ? "x86" : arch()}.node`;
  IPC.wasm(isWasm || !available.includes(name), name);
}
