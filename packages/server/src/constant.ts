import { ipcAppspace, ipcBroadcastServerId, ipcServerId } from "@cloudmusic/shared";
import { homedir } from "node:os";
import { resolve } from "node:path";

export const ipcServerPath =
  process.platform === "win32" ? `\\\\.\\pipe\\tmp-${ipcAppspace}${ipcServerId}` : `/tmp/${ipcAppspace}${ipcServerId}`;

export const ipcBroadcastServerPath =
  process.platform === "win32"
    ? `\\\\.\\pipe\\tmp-${ipcAppspace}${ipcBroadcastServerId}`
    : `/tmp/${ipcAppspace}${ipcBroadcastServerId}`;

export const SETTING_DIR = process.env["CM_SETTING_DIR"] || resolve(homedir(), ".cloudmusic");
export const TMP_DIR = resolve(SETTING_DIR, "tmp");
export const CACHE_DIR = resolve(SETTING_DIR, "cache");
export const MUSIC_CACHE_DIR = resolve(CACHE_DIR, "music");
export const LYRIC_CACHE_DIR = resolve(CACHE_DIR, "lyric");

export const RETAIN_FILE = resolve(SETTING_DIR, "retain");
