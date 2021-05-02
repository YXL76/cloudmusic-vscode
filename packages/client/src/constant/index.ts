export * from "./setting";
export * from "./type";
import { MUSIC_QUALITY, UNBLOCK_MUSIC } from "./setting";
import { Uri } from "vscode";
import { homedir } from "os";

export const unplayable = new Set<number>();

export const ACCOUNT_KEY = "account";
export const CACHE_KEY = "cache-v2";
export const LYRIC_CACHE_KEY = "lyric-cache-v1";
export const COOKIE_KEY = "cookie";
export const BUTTON_KEY = "button-v1";
export const VOLUME_KEY = "volume";
export const LYRIC_KEY = "lyric";
export const LOCAL_FOLDER_KEY = "local-folder";
export const QUEUE_KEY = "queue";

export const HOME_DIR = Uri.file(homedir());
export const SETTING_DIR = Uri.joinPath(HOME_DIR, ".cloudmusic");
export const TMP_DIR = Uri.joinPath(SETTING_DIR, "tmp");
export const CACHE_DIR = Uri.joinPath(SETTING_DIR, "cache");
export const MUSIC_CACHE_DIR_NAME = `${MUSIC_QUALITY}${
  UNBLOCK_MUSIC.enabled ? "u" : ""
}`;
export const MUSIC_CACHE_DIR = Uri.joinPath(CACHE_DIR, "music");
export const LYRIC_CACHE_DIR = Uri.joinPath(CACHE_DIR, "lyric");

export const AUTH_PROVIDER_ID = "cloudmusic-auth-provider";

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
  lyric = "$(text-size)",
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
