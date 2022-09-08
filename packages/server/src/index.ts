import { CACHE_DIR, LYRIC_CACHE_DIR, MUSIC_CACHE_DIR, TMP_DIR } from "./constant";
import type { CSMessage, IPCApi, IPCMsg } from "@cloudmusic/shared";
import { MUSIC_CACHE } from "./cache";
import type { NeteaseAPI } from "./api";
import { bootstrap } from "global-agent";
import http from "node:http";
import https from "node:https";
import { logError } from "./utils";
import { mkdir } from "node:fs/promises";

export type NeteaseAPIKey = keyof typeof NeteaseAPI;

export type NeteaseAPIParameters<T extends NeteaseAPIKey> = Parameters<typeof NeteaseAPI[T]>;

export type NeteaseAPIReturn<T extends NeteaseAPIKey> = ReturnType<typeof NeteaseAPI[T]> extends PromiseLike<infer U>
  ? U
  : ReturnType<typeof NeteaseAPI[T]>;

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

await mkdir(TMP_DIR).catch(() => undefined);
await mkdir(CACHE_DIR).catch(() => undefined);
await mkdir(LYRIC_CACHE_DIR).catch(() => undefined);
await mkdir(MUSIC_CACHE_DIR).catch(() => undefined);
await MUSIC_CACHE.init();
