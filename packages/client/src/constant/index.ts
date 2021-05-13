import { workspace } from "vscode";

const conf = workspace.getConfiguration("cloudmusic");

export const AUTO_CHECK = conf.get("account.autoCheck", false);
export const MUSIC_QUALITY = conf.get<128000 | 192000 | 320000 | 999000>(
  "music.quality",
  192000
);
export const MUSIC_CACHE_SIZE = conf.get("cache.size", 4096) * 1024 * 1024;

export const ACCOUNT_KEY = "account";
export const CACHE_KEY = "cache-v2";
export const LYRIC_CACHE_KEY = "lyric-cache-v2";
export const COOKIE_KEY = "cookie";
export const BUTTON_KEY = "button-v1";
export const VOLUME_KEY = "volume";
export const LYRIC_KEY = "lyric-v2";
export const LOCAL_FOLDER_KEY = "local-folder-v2";
export const REPEAT_KEY = "repeat-v1";
export const FM_KEY = "fm-v1";
export const SHOW_LYRIC_KEY = "show-lyric-v1";

export const MUSIC_CACHE_DIR_NAME = `${MUSIC_QUALITY}`;

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
