export * from "./shared.js";

import type { WorkspaceConfiguration } from "vscode";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { workspace } from "vscode";

export const CONF = (): WorkspaceConfiguration => workspace.getConfiguration("cloudmusic");

const kConf = CONF();

export const SETTING_DIR = kConf.get<string | null>("cache.path") || resolve(homedir(), ".cloudmusic");
export const MUSIC_CACHE_DIR = resolve(SETTING_DIR, "cache", "music");

export const AUTO_START = kConf.get("host.autoStart", false);
export const AUTO_CHECK = kConf.get("account.autoCheck", false);
export const MUSIC_QUALITY = (conf: WorkspaceConfiguration): number =>
  conf.get<128000 | 192000 | 320000 | 999000>("music.quality", 192000);
export const MUSIC_CACHE_SIZE = (conf: WorkspaceConfiguration): number => conf.get("cache.size", 4096) * 1024 * 1024;
export const PROXY = kConf.get("network.proxy", "");
export const STRICT_SSL = kConf.get("network.strictSSL", true);
export const HTTPS_API = (conf: WorkspaceConfiguration): boolean => conf.get("network.httpsAPI", true);
export const FOREIGN = (conf: WorkspaceConfiguration): boolean => conf.get("network.foreignUser", false);
export const PLAYER_MODE = kConf.get<"auto" | "native" | "wasm">("player.mode", "auto");
export const QUEUE_INIT = kConf.get<"none" | "recommend" | "restore">("queue.initialization", "none");

export const ACCOUNT_KEY = "account-v3";
export const CACHE_KEY = "cache-v4";
export const LYRIC_CACHE_KEY = "lyric-cache-v6";
export const COOKIE_KEY = "cookie-v5";
export const BUTTON_KEY = "button-v2";
export const SPEED_KEY = "speed";
export const VOLUME_KEY = "volume";
export const LYRIC_KEY = "lyric-v3";
export const LOCAL_FOLDER_KEY = "local-folder-v2";
export const REPEAT_KEY = "repeat-v1";
export const FM_KEY = "fm-v2";
export const SHOW_LYRIC_KEY = "show-lyric-v1";

// export const AUTH_PROVIDER_ID = "cloudmusic-auth-provider";
