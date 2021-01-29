import { Uri, workspace } from "vscode";

const conf = workspace.getConfiguration("cloudmusic");

export const MEDIA_CONTROL = conf.get("player.mediaControl") as boolean;

export const AUTO_CHECK = conf.get("account.autoCheck") as boolean;

export const MUSIC_QUALITY = conf.get("music.quality") as
  | 128000
  | 192000
  | 320000
  | 999000;

const UNLOCK_MUSIC_KUWO = conf.get("music.unlock.kuwo") as boolean;
const UNLOCK_MUSIC_MIGU = conf.get("music.unlock.migu") as boolean;
const UNLOCK_MUSIC_KUGOU = conf.get("music.unlock.kugou") as boolean;
const UNLOCK_MUSIC_JOOX = conf.get("music.unlock.joox") as boolean;

export const UNLOCK_MUSIC = {
  enabled:
    UNLOCK_MUSIC_KUWO ||
    UNLOCK_MUSIC_MIGU ||
    UNLOCK_MUSIC_KUGOU ||
    UNLOCK_MUSIC_JOOX,
  kuwo: UNLOCK_MUSIC_KUWO,
  migu: UNLOCK_MUSIC_MIGU,
  kugou: UNLOCK_MUSIC_KUGOU,
  joox: UNLOCK_MUSIC_JOOX,
};

const localDir: string | undefined = conf.get("cache.localDirectory");

export const LOCAL_FILE_DIR: Uri | undefined = localDir
  ? Uri.file(localDir)
  : undefined;

export const MUSIC_CACHE_SIZE =
  (conf.get("cache.size") as number) * 1024 * 1024;
