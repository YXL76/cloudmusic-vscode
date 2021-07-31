import {
  CACHE_DIR,
  LYRIC_CACHE_DIR,
  MUSIC_CACHE_DIR,
  TMP_DIR,
} from "./constant";
import { IPCBroadcastServer, IPCServer } from "./server";
import { MusicCache } from "./cache";
import { bootstrap } from "global-agent";
import { logError } from "./utils";
import { mkdirSync } from "fs";

process.setUncaughtExceptionCaptureCallback(logError);
process.on("unhandledRejection", logError);

if (process.env.GLOBAL_AGENT_HTTP_PROXY) bootstrap();

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
