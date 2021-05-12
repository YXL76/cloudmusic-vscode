import { homedir, platform } from "os";
import { resolve } from "path";

const ipcAppspace = "cm-vsc";
const ipcServerId = "server";
const ipcBroadcastServerId = "bc-server";

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

export const ipcDelimiter = "\f";

export const SETTING_DIR = resolve(homedir(), ".cloudmusic");
export const LOG_FILE = resolve(SETTING_DIR, "err.log");
export const TMP_DIR = resolve(SETTING_DIR, "tmp");
export const CACHE_DIR = resolve(SETTING_DIR, "cache");
export const MUSIC_CACHE_DIR = resolve(CACHE_DIR, "music");
export const LYRIC_CACHE_DIR = resolve(CACHE_DIR, "lyric");
