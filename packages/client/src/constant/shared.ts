import {
  ipcAppspace,
  ipcBroadcastServerId,
  ipcServerId,
} from "@cloudmusic/shared";

export const ipcServerPath =
  process.platform === "win32"
    ? `\\\\.\\pipe\\${`/tmp/${ipcAppspace}${ipcServerId}`
        .replace(/^\//, "")
        .replace(/\//g, "-")}`
    : `/tmp/${ipcAppspace}${ipcServerId}`;

export const ipcBroadcastServerPath =
  process.platform === "win32"
    ? `\\\\.\\pipe\\${`/tmp/${ipcAppspace}${ipcBroadcastServerId}`
        .replace(/^\//, "")
        .replace(/\//g, "-")}`
    : `/tmp/${ipcAppspace}${ipcBroadcastServerId}`;
