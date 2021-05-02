import { workspace } from "vscode";

const conf = workspace.getConfiguration("cloudmusic");

export const AUTO_CHECK = conf.get("account.autoCheck", false);

export const MUSIC_QUALITY = conf.get<128000 | 192000 | 320000 | 999000>(
  "music.quality",
  192000
);

const UNBLOCK_MUSIC_KUWO = conf.get("music.unblock.kuwo", false);
const UNBLOCK_MUSIC_MIGU = conf.get("music.unblock.migu", false);
const UNBLOCK_MUSIC_KUGOU = conf.get("music.unblock.kugou", false);
const UNBLOCK_MUSIC_JOOX = conf.get("music.unblock.joox", false);

export const UNBLOCK_MUSIC = {
  enabled:
    UNBLOCK_MUSIC_KUWO ||
    UNBLOCK_MUSIC_MIGU ||
    UNBLOCK_MUSIC_KUGOU ||
    UNBLOCK_MUSIC_JOOX,
  kuwo: UNBLOCK_MUSIC_KUWO,
  migu: UNBLOCK_MUSIC_MIGU,
  kugou: UNBLOCK_MUSIC_KUGOU,
  joox: UNBLOCK_MUSIC_JOOX,
};

export const MUSIC_CACHE_SIZE = conf.get("cache.size", 4096) * 1024 * 1024;
