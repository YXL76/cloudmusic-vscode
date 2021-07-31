import type { CSMessage, IPCEvent, IPCMsg } from "@cloudmusic/shared";
import type { NeteaseAPI } from "./api";

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
  IPCEvent.Api$netease,
  CSMessage<{ i: T; p: NeteaseAPIParameters<T> }>
>;

export type NeteaseAPISMsg<T extends NeteaseAPIKey> = IPCMsg<
  IPCEvent.Api$netease,
  CSMessage<NeteaseAPIReturn<T>>
>;
