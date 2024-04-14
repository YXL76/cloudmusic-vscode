import { CACHE_DIR, LYRIC_CACHE_DIR, MUSIC_CACHE_DIR, TMP_DIR } from "./constant.js";
import type { CSMessage, IPCApi, IPCMsg } from "@cloudmusic/shared";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { MUSIC_CACHE } from "./cache.js";
import type { NeteaseAPI } from "./api/index.js";
import { bootstrap } from "global-agent";
import http from "node:http";
import https from "node:https";
import { logError } from "./utils.js";
import { resolve } from "node:path";

export type NeteaseAPIKey = keyof typeof NeteaseAPI;

export type NeteaseAPIParameters<T extends NeteaseAPIKey> = Parameters<(typeof NeteaseAPI)[T]>;

export type NeteaseAPIReturn<T extends NeteaseAPIKey> =
  ReturnType<(typeof NeteaseAPI)[T]> extends PromiseLike<infer U> ? U : ReturnType<(typeof NeteaseAPI)[T]>;

export type NeteaseAPICMsg<T extends NeteaseAPIKey> = IPCMsg<
  IPCApi.netease,
  CSMessage<{ i: T; p: NeteaseAPIParameters<T> }>
>;

export type NeteaseAPISMsg<T extends NeteaseAPIKey> = IPCMsg<IPCApi.netease, CSMessage<NeteaseAPIReturn<T>>>;

process.on("unhandledRejection", logError);
process.on("uncaughtException", logError);
if (process.env.GLOBAL_AGENT_HTTP_PROXY) bootstrap();
else {
  const agentOptions = { keepAlive: true, maxSockets: 32 };
  http.globalAgent = new http.Agent(agentOptions);
  https.globalAgent = new https.Agent(agentOptions);
}

await Promise.allSettled([mkdir(TMP_DIR), mkdir(CACHE_DIR)]);
await Promise.allSettled([mkdir(LYRIC_CACHE_DIR), mkdir(MUSIC_CACHE_DIR)]);
await MUSIC_CACHE.init();

{
  const exp = Date.now() - 86400000; // 1 day
  const names = await readdir(TMP_DIR);
  await Promise.allSettled(
    names.map(async (name) => {
      const path = resolve(TMP_DIR, name);
      const { birthtimeMs } = await stat(path);
      if (exp >= birthtimeMs) return rm(path, { force: true });
    }),
  );
}
