import { homedir, platform } from "os";
import {
  ipcAppspace,
  ipcBroadcastServerId,
  ipcServerId,
} from "@cloudmusic/shared";
import { resolve } from "path";

export const ipcServerPath =
  platform() === "win32"
    ? `\\\\.\\pipe\\${`/tmp/${ipcAppspace}${ipcServerId}`
        .replace(/^\//, "")
        .replace(/\//g, "-")}`
    : `/tmp/${ipcAppspace}${ipcServerId}`;

export const ipcBroadcastServerPath =
  platform() === "win32"
    ? `\\\\.\\pipe\\${`/tmp/${ipcAppspace}${ipcBroadcastServerId}`
        .replace(/^\//, "")
        .replace(/\//g, "-")}`
    : `/tmp/${ipcAppspace}${ipcBroadcastServerId}`;

export const SETTING_DIR = resolve(homedir(), ".cloudmusic");
