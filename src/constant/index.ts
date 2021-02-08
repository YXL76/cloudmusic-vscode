export * from "./setting";
export * from "./type";
import { MUSIC_QUALITY, UNBLOCK_MUSIC } from "./setting";
import { homedir, platform } from "os";
import type { NativeModule } from "./type";
import { Uri } from "vscode";
import { resolve } from "path";

export const unplayable = new Set<number>();

export const PLATFORM = platform();
export const PLAYER_AVAILABLE =
  PLATFORM === "win32" || PLATFORM === "linux" || PLATFORM === "darwin";

// eslint-disable-next-line @typescript-eslint/naming-convention
declare function __non_webpack_require__(_: string): unknown;
export const NATIVE = __non_webpack_require__(
  resolve(__dirname, "..", "build", `${PLATFORM}.node`)
) as NativeModule;

export const ACCOUNT_KEY = "account";
export const COOKIE_KEY = "cookie";
export const BUTTON_KEY = "button";
export const VOLUME_KEY = "volume";
export const LYRIC_KEY = "lyric";
export const LOCAL_FOLDER_KEY = "localFolder";

export const HOME_DIR = Uri.file(homedir());
export const SETTING_DIR = Uri.joinPath(HOME_DIR, ".cloudmusic");
export const TMP_DIR = Uri.joinPath(SETTING_DIR, "tmp");
export const CACHE_DIR = Uri.joinPath(SETTING_DIR, "cache");
export const MUSIC_CACHE_DIR_NAME = `${MUSIC_QUALITY}${
  UNBLOCK_MUSIC.enabled ? "u" : ""
}`;
export const MUSIC_CACHE_DIR = Uri.joinPath(
  CACHE_DIR,
  "music",
  MUSIC_CACHE_DIR_NAME
);
export const LYRIC_CACHE_DIR = Uri.joinPath(CACHE_DIR, "lyric");

export const enum ICON {
  album = "$(circuit-board)",
  artist = "$(account)",
  comment = "$(comment)",
  copy = "$(link)",
  description = "$(markdown)",
  download = "$(cloud-download)",
  fm = "$(radio-tower)",
  level = "$(graph)",
  like = "$(heart)",
  name = "$(code)",
  number = "$(symbol-number)",
  playlist = "$(list-unordered)",
  rankinglist = "$(list-ordered)",
  save = "$(diff-added)",
  unsave = "$(diff-removed)",
  add = "$(add)",
  search = "$(search)",
  similar = "$(library)",
  song = "$(zap)",
  radio = "$(rss)",
  program = "$(radio-tower)",
  hot = "$(flame)",
  play = "$(play)",
}
