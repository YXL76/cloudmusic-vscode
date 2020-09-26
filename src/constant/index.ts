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
  RawPlaylistItem,
  SongDetail,
  SongsItem,
  TrackIdsItem,
  UserDetail,
} from "./type";
import { homedir, platform } from "os";
import { MUSIC_QUALITY } from "./setting";
import type { NativeModule } from "./type";
import { Uri } from "vscode";
import { getAbi } from "node-abi";
import { join } from "path";

export const PLATFORM = platform();
export const PLAYER_AVAILABLE =
  PLATFORM === "win32" || PLATFORM === "linux" || PLATFORM === "darwin";

const abi = getAbi(
  (process.versions as NodeJS.ProcessVersions & { electron: string }).electron,
  "electron"
);
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const __non_webpack_require__: (_: string) => unknown;
export const NATIVE: NativeModule = __non_webpack_require__(
  join("..", "build", `${PLATFORM}-${abi}.node`)
) as NativeModule;

export const ACCOUNT_KEY = "account";
export const BUTTON_KEY = "button";
export const VOLUME_KEY = "volume";

export const SETTING_DIR = Uri.joinPath(Uri.file(homedir()), ".cloudmusic");
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
  level: "$(graph)",
  like: "$(heart)",
  name: "$(link)",
  number: "$(symbol-number)",
  playlist: "$(list-unordered)",
  rankinglist: "$(list-ordered)",
  save: "$(diff-added)",
  unsave: "$(diff-removed)",
  add: "$(add)",
  search: "$(search)",
  similar: "$(library)",
  song: "$(zap)",
};
