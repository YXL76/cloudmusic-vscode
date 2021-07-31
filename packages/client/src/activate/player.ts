import { arch, platform } from "os";
import { IPC } from "../utils";

/* const available = [
  "win32-arm64.node",
  "darwin-x86.node",
  "linux-x86.node",
  "win32-x86.node",
]; */

export function initPlayer(): void {
  const name = `${platform()}-${arch() === "x64" ? "x86" : arch()}.node`;

  /* if (available.includes(name)) {
  } else {
  } */
  IPC.wasm(true, name);
}
