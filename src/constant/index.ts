export {
  AUTO_CHECK,
  LIBRARYS,
  LOCAL_FILE_DIR,
  MEDIA_CONTROL,
  MUSIC_CACHE_SIZE,
  MUSIC_QUALITY,
  PROXY,
  REAL_IP,
} from "./setting";
export {
  AlbumsItem,
  AnotherSongItem,
  Artist,
  LruCacheValue,
  Lyric,
  LyricData,
  NativeModule,
  NativePlayer,
  Player,
  PlaylistItem,
  SongDetail,
  SongsItem,
  TrackIdsItem,
} from "./type";
import { homedir, platform } from "os";
import { MUSIC_QUALITY } from "./setting";
import { Uri } from "vscode";
import { getAbi } from "node-abi";
import { join } from "path";

export const PLATFORM = platform();
export const PLAYER_AVAILABLE =
  PLATFORM === "win32" || PLATFORM === "linux" || PLATFORM === "darwin";

// @ts-ignore
const abi = getAbi(process.versions.electron, "electron") as string;
// @ts-ignore
export const NATIVE: NativeModule = __non_webpack_require__(
  join("..", "build", `${PLATFORM}-${abi}.node`)
);

export const SETTING_DIR = Uri.joinPath(Uri.file(homedir()), ".cloudmusic");
export const ACCOUNT_FILE = Uri.joinPath(SETTING_DIR, ".account");
export const BUTTON_FILE = Uri.joinPath(SETTING_DIR, ".button");
export const TMP_DIR = Uri.joinPath(SETTING_DIR, "tmp");
export const CACHE_DIR = Uri.joinPath(SETTING_DIR, "cache");
export const MUSIC_CACHE_DIR = Uri.joinPath(
  CACHE_DIR,
  "music",
  `${MUSIC_QUALITY}`
);
export const LYRIC_CACHE_DIR = Uri.joinPath(CACHE_DIR, "lyric");

export const ICON = {
  album: "$(circuit-board)",
  artist: "$(account)",
  description: "$(markdown)",
  fm: "$(radio-tower)",
  like: "$(heart)",
  name: "$(link)",
  number: "$(symbol-number)",
  playlist: "$(list-unordered)",
  save: "$(add)",
  search: "$(search)",
  similar: "$(library)",
  song: "$(zap)",
};
