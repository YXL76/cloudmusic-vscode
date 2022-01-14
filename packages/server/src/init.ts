import {
  CACHE_DIR,
  LYRIC_CACHE_DIR,
  MUSIC_CACHE_DIR,
  TMP_DIR,
} from "./constant";
import { IPCBroadcastServer, IPCServer } from "./server";
import { MusicCache } from "./cache";
import { Player } from "./player";
import { bootstrap } from "global-agent";
import http from "http";
import https from "https";
import { logError } from "./utils";
import { mkdirSync } from "fs";

process.on("unhandledRejection", logError);

if (process.env.GLOBAL_AGENT_HTTP_PROXY) bootstrap();
else {
  http.globalAgent = new http.Agent({ keepAlive: true });
  https.globalAgent = new https.Agent({ keepAlive: true });
}

const tryMkdir = (path: string) => {
  try {
    mkdirSync(path);
  } catch {}
};

Player.init();
void IPCServer.init();
void IPCBroadcastServer.init();

tryMkdir(TMP_DIR);
tryMkdir(CACHE_DIR);
tryMkdir(LYRIC_CACHE_DIR);
tryMkdir(MUSIC_CACHE_DIR);
void MusicCache.init();
