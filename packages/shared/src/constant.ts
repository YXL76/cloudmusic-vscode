import type { NodeIPC } from "node-ipc";

export const ipcServerId = "server";

export const ipcDefaultConfig: Partial<NodeIPC.Config> = {
  appspace: "cloudmusic-vscode",
  maxRetries: 4,
  silent: true,
};
