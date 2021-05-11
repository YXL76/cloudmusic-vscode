export const ipcAppspace = "cm-vsc";
export const ipcServerId = "server";
export const ipcBroadcastServerId = "bc-server";

export const ipcDelimiter = "\f";

import { homedir } from "os";
import { resolve } from "path";

export const HOME_DIR = homedir();
export const SETTING_DIR = resolve(HOME_DIR, ".cloudmusic");
export const TMP_DIR = resolve(SETTING_DIR, "tmp");
export const CACHE_DIR = resolve(SETTING_DIR, "cache");
export const MUSIC_CACHE_DIR = resolve(CACHE_DIR, "music");
export const LYRIC_CACHE_DIR = resolve(CACHE_DIR, "lyric");
