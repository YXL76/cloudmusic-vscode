import { homedir, platform } from "os";
import { posix } from "path";
import { workspace } from "vscode";

const conf = workspace.getConfiguration("cloudmusic");
export const PLATFORM = platform();

export const SETTING_DIR = posix.join(homedir(), ".cloudmusic");
export const ACCOUNT_FILE = posix.join(SETTING_DIR, ".account");

export const AUTO_CHECK = conf.get("account.autoCheck");

export const PROXY = conf.get("music.proxy")
  ? conf.get("music.proxy")
  : undefined;

export const MUSIC_QUALITY = conf.get("music.quality");

export const TMP_DIR = posix.join(SETTING_DIR, "tmp");
export const CACHE_DIR = posix.join(SETTING_DIR, "cache", `${MUSIC_QUALITY}`);

const cacheSize = conf.get("cache.size");
let finalSize = typeof cacheSize === "number" ? cacheSize : 1024;
finalSize = finalSize > 10240 ? 10240 : finalSize;
finalSize = finalSize < 128 ? 128 : finalSize;
export const CACHE_SIZE = finalSize * 1024 * 1024;
