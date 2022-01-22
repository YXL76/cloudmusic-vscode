import {
  CACHE_DIR,
  LYRIC_CACHE_DIR,
  MUSIC_CACHE_DIR,
  TMP_DIR,
} from "./constant";
import { IPCBroadcastServer, IPCServer } from "./server";
import { readdir, rm } from "fs/promises";
import { MusicCache } from "./cache";
import { Player } from "./player";
import { bootstrap } from "global-agent";
import http from "http";
import https from "https";
import { logError } from "./utils";
import { mkdirSync } from "fs";
import { resolve } from "path";

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

setInterval(
  () => {
    readdir(TMP_DIR)
      .then((files) => {
        for (const file of files) {
          // Playing || Downloading
          if (file === `${Player.id}` || file === `${Player.next?.id || ""}`)
            continue;
          // Remove unused file
          const path = resolve(TMP_DIR, file);
          rm(path).catch(logError);
          // every tick only delete one file
          return;
        }
        // If no files were deleted, the cache can be considered stable
        // In practice, this is mostly invoked every 4 minutes (two ticks)
        void MusicCache.store();
      })
      .catch(logError);
  },
  // Assume the duration of a song is 3.5 minutes
  // Do the cleanup every 2 minutes (2 * 60 * 1000 = 120000)
  120000
);
