import { workspace } from "vscode";

const conf = workspace.getConfiguration("cloudmusic");

export const MEDIA_CONTROL = conf.get<boolean>("player.mediaControl");

export const AUTO_CHECK = conf.get<boolean>("account.autoCheck");

export const MUSIC_QUALITY =
  conf.get<128000 | 192000 | 320000 | 999000>("music.quality") || 192000;

const UNLOCK_MUSIC_KUWO = conf.get<boolean>("music.unlock.kuwo");
const UNLOCK_MUSIC_MIGU = conf.get<boolean>("music.unlock.migu");
const UNLOCK_MUSIC_KUGOU = conf.get<boolean>("music.unlock.kugou");
const UNLOCK_MUSIC_JOOX = conf.get<boolean>("music.unlock.joox");

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

export const MUSIC_CACHE_SIZE =
  (conf.get<number>("cache.size") || 4096) * 1024 * 1024;
