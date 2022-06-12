import {
  CACHE_DIR,
  LYRIC_CACHE_DIR,
  MUSIC_CACHE_DIR,
  TMP_DIR,
} from "./constant";
import type { CSMessage, IPCApi, IPCMsg } from "@cloudmusic/shared";
import { IPCBroadcastServer, IPCServer } from "./server";
import { readdir, rm } from "node:fs/promises";
import { MusicCache } from "./cache";
import type { NeteaseAPI } from "./api";
import { Player } from "./player";
import { bootstrap } from "global-agent";
import http from "node:http";
import https from "node:https";
import { logError } from "./utils";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export type NeteaseAPIKey = keyof typeof NeteaseAPI;

export type NeteaseAPIParameters<T extends NeteaseAPIKey> = Parameters<
  typeof NeteaseAPI[T]
>;

export type NeteaseAPIReturn<T extends NeteaseAPIKey> = ReturnType<
  typeof NeteaseAPI[T]
> extends PromiseLike<infer U>
  ? U
  : ReturnType<typeof NeteaseAPI[T]>;

export type NeteaseAPICMsg<T extends NeteaseAPIKey> = IPCMsg<
  IPCApi.netease,
  CSMessage<{ i: T; p: NeteaseAPIParameters<T> }>
>;

export type NeteaseAPISMsg<T extends NeteaseAPIKey> = IPCMsg<
  IPCApi.netease,
  CSMessage<NeteaseAPIReturn<T>>
>;

process.on("unhandledRejection", logError);
process.on("uncaughtException", logError);
if (process.env.GLOBAL_AGENT_HTTP_PROXY) bootstrap();
else {
  const agentOptions = {
    keepAlive: true,
    maxSockets: 32,
  };
  http.globalAgent = new http.Agent(agentOptions);
  https.globalAgent = new https.Agent(agentOptions);
}

(async () => {
  Player.init();
  void IPCServer.init();
  void IPCBroadcastServer.init();

  await mkdir(TMP_DIR).catch(() => undefined);
  await mkdir(CACHE_DIR).catch(() => undefined);
  await mkdir(LYRIC_CACHE_DIR).catch(() => undefined);
  await mkdir(MUSIC_CACHE_DIR).catch(() => undefined);
  await MusicCache.init();

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
})().catch(logError);
