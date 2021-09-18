export * from "./shared";

import type { WorkspaceConfiguration } from "vscode";
import { workspace } from "vscode";

export const CONF = (): WorkspaceConfiguration =>
  workspace.getConfiguration("cloudmusic");

const kConf = CONF();

export const AUTO_CHECK = kConf.get("account.autoCheck", false);
export const MUSIC_QUALITY = (conf: WorkspaceConfiguration): number =>
  conf.get<128000 | 192000 | 320000 | 999000>("music.quality", 192000);
export const MUSIC_CACHE_SIZE = (conf: WorkspaceConfiguration): number =>
  conf.get("cache.size", 4096) * 1024 * 1024;
export const STRICT_SSL = kConf.get("network.strictSSL", true);
export const HTTPS_API = (conf: WorkspaceConfiguration): boolean =>
  conf.get("network.httpsAPI", true);
export const FOREIGN = (conf: WorkspaceConfiguration): boolean =>
  conf.get("network.foreignUser", false);
export const PLAYER_MODE = kConf.get<"native" | "wasm">(
  "player.mode",
  "native"
);
export const QUEUE_INIT = kConf.get<"none" | "recommend" | "restore">(
  "queue.initialization",
  "none"
);

export const ACCOUNT_KEY = "account-v2";
export const CACHE_KEY = "cache-v2";
export const LYRIC_CACHE_KEY = "lyric-cache-v4";
export const COOKIE_KEY = "cookie-v2";
export const BUTTON_KEY = "button-v2";
export const VOLUME_KEY = "volume";
export const LYRIC_KEY = "lyric-v2";
export const LOCAL_FOLDER_KEY = "local-folder-v2";
export const REPEAT_KEY = "repeat-v1";
export const FM_KEY = "fm-v1";
export const SHOW_LYRIC_KEY = "show-lyric-v1";

export const MUSIC_CACHE_DIR_NAME = (): string => `${MUSIC_QUALITY(CONF())}`;

// export const AUTH_PROVIDER_ID = "cloudmusic-auth-provider";
