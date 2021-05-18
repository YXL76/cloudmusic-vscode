import {
  CACHE_DIR,
  LYRIC_CACHE_DIR,
  MUSIC_CACHE_DIR,
  TMP_DIR,
} from "@cloudmusic/shared";
import { IPCBroadcastServer, IPCServer, MusicCache } from ".";
import { mkdirSync } from "fs";

const tryMkdir = (path: string) => {
  try {
    mkdirSync(path);
  } catch {}
};

IPCServer.init();
IPCBroadcastServer.init();

tryMkdir(TMP_DIR);
tryMkdir(CACHE_DIR);
tryMkdir(LYRIC_CACHE_DIR);
tryMkdir(MUSIC_CACHE_DIR);
void MusicCache.init();
