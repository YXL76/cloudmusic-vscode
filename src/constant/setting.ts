import { workspace } from "vscode";

const conf = workspace.getConfiguration("cloudmusic");

export const MEDIA_CONTROL = conf.get<boolean>("player.mediaControl");

export const AUTO_CHECK = conf.get<boolean>("account.autoCheck");

export const MUSIC_QUALITY =
  conf.get<128000 | 192000 | 320000 | 999000>("music.quality") || 192000;

const UNBLOCK_MUSIC_KUWO = conf.get<boolean>("music.unblock.kuwo");
const UNBLOCK_MUSIC_MIGU = conf.get<boolean>("music.unblock.migu");
const UNBLOCK_MUSIC_KUGOU = conf.get<boolean>("music.unblock.kugou");
const UNBLOCK_MUSIC_JOOX = conf.get<boolean>("music.unblock.joox");

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

export const MUSIC_CACHE_SIZE =
  (conf.get<number>("cache.size") || 4096) * 1024 * 1024;
