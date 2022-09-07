import { ipcAppspace, ipcBroadcastServerId, ipcServerId } from "@cloudmusic/shared";

export const ipcServerPath =
  process.platform === "win32" ? `\\\\.\\pipe\\tmp-${ipcAppspace}${ipcServerId}` : `/tmp/${ipcAppspace}${ipcServerId}`;

export const ipcBroadcastServerPath =
  process.platform === "win32"
    ? `\\\\.\\pipe\\tmp-${ipcAppspace}${ipcBroadcastServerId}`
    : `/tmp/${ipcAppspace}${ipcBroadcastServerId}`;

export const NATIVE_MODULE = `${process.platform}-${process.arch}.node`;
