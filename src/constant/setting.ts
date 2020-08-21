import { homedir, platform } from "os";
import { NativeModule } from "../constant";
import { getAbi } from "node-abi";
import { join } from "path";
import { workspace } from "vscode";

// @ts-ignore
const abi = getAbi(process.versions.electron, "electron");

const conf = workspace.getConfiguration("cloudmusic");
export const PLATFORM = platform();

// @ts-ignore
export const NATIVE: NativeModule = __non_webpack_require__(
  join("..", "build", `${PLATFORM}-${abi}.node`)
);

export const PLAYER_AVAILABLE =
  PLATFORM === "win32" || PLATFORM === "linux" || PLATFORM === "darwin";
export const MEDIA_CONTROL =
  conf.get("player.mediaControl") && PLAYER_AVAILABLE;

const defaultLibrary: string = conf.get("player.defaultLibrary") ?? "Rodio";
const librarys = ["Rodio", "Miniaudio"].filter((i) => i !== defaultLibrary);
librarys.unshift(defaultLibrary);
export const LIBRARYS = librarys;

export const SETTING_DIR = join(homedir(), ".cloudmusic");
export const ACCOUNT_FILE = join(SETTING_DIR, ".account");
export const BUTTON_FILE = join(SETTING_DIR, ".button");

export const AUTO_CHECK = conf.get("account.autoCheck");

export const PROXY = conf.get("music.proxy")
  ? conf.get("music.proxy")
  : undefined;
export const REAL_IP = conf.get("music.realIP")
  ? conf.get("music.realIP")
  : undefined;

export const MUSIC_QUALITY = conf.get("music.quality");

export const TMP_DIR = join(SETTING_DIR, "tmp");
export const CACHE_DIR = join(SETTING_DIR, "cache");
export const MUSIC_CACHE_DIR = join(CACHE_DIR, "music", `${MUSIC_QUALITY}`);
export const LYRIC_CACHE_DIR = join(CACHE_DIR, "lyric");

const cacheSize = conf.get("cache.size");
let finalSize = typeof cacheSize === "number" ? cacheSize : 1024;
finalSize = finalSize > 10240 ? 10240 : finalSize;
finalSize = finalSize < 128 ? 128 : finalSize;
export const MUSIC_CACHE_SIZE = finalSize * 1024 * 1024;
