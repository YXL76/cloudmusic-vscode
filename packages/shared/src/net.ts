import type { IPCEvent } from ".";
import type { NeteaseAPI } from "@cloudmusic/server";
import type { NeteaseTypings } from "api";

export type CSMessage<T = undefined, U = number | string> = {
  channel: U;
  msg: T;
};

export type CSConnPool = Map<
  number | string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { resolve: (value?: any) => void; reject: (reason?: string) => void }
>;

export type IPCMsg<T = string, U = Record<never, never>> = { t: T } & U;

export type IPCBroadcastMsg =
  | IPCMsg<IPCEvent.Control$login, { userId: number; nickname: string }>
  | IPCMsg<IPCEvent.Control$logout>
  | IPCMsg<IPCEvent.Play$load>
  | IPCMsg<IPCEvent.Play$repeat, { r: boolean }>
  | IPCMsg<IPCEvent.Queue$add, { items: unknown[]; index?: number }>
  | IPCMsg<IPCEvent.Queue$clear>
  | IPCMsg<IPCEvent.Queue$delete, { id: string | number }>
  | IPCMsg<IPCEvent.Queue$new, { items: unknown[]; id?: number }>
  | IPCMsg<IPCEvent.Queue$play, { id: string | number }>
  | IPCMsg<IPCEvent.Queue$shift, { index: number }>;

export type IPCClientMsg =
  | IPCMsg<IPCEvent.Control$deleteCache, { key: string }>
  | IPCMsg<IPCEvent.Control$download, { url: string; path: string }>
  | IPCMsg<IPCEvent.Control$init, { mq: number; cs: number; volume: number }>
  | IPCMsg<IPCEvent.Control$lyric>
  | IPCMsg<IPCEvent.Control$music>
  | IPCMsg<IPCEvent.Control$retain, { items: unknown[] }>
  | IPCMsg<
      IPCEvent.Play$load,
      {
        url: string;
        dt?: undefined;
        id?: undefined;
        pid?: undefined;
        local: true;
        next?: undefined;
      }
    >
  | IPCMsg<
      IPCEvent.Play$load,
      { dt: number; id: number; pid: number; local?: undefined; next?: number }
    >
  | IPCMsg<IPCEvent.Play$lyricDelay, { delay: number }>
  | IPCMsg<IPCEvent.Play$stop>
  | IPCMsg<IPCEvent.Play$toggle>
  | IPCMsg<IPCEvent.Play$volume, { level: number }>
  | IPCMsg<IPCEvent.Queue$fm, { is: boolean }>
  | IPCMsg<IPCEvent.Queue$fmNext>;

export type IPCServerMsg =
  | IPCMsg<IPCEvent.Control$cookie, { cookie: string }>
  | IPCMsg<IPCEvent.Control$master, { is?: true }>
  | IPCMsg<IPCEvent.Control$new>
  | IPCMsg<IPCEvent.Control$retain, { items: unknown[] }>
  | IPCMsg<IPCEvent.Play$end, { fail?: true }>
  | IPCMsg<IPCEvent.Play$load>
  | IPCMsg<IPCEvent.Play$lyric, { lyric: NeteaseTypings.LyricData }>
  | IPCMsg<IPCEvent.Play$lyricIndex, { oi: number; ti: number }>
  | IPCMsg<IPCEvent.Play$pause>
  | IPCMsg<IPCEvent.Play$play>
  | IPCMsg<IPCEvent.Play$stop>
  | IPCMsg<IPCEvent.Play$volume, { level: number }>
  | IPCMsg<IPCEvent.Queue$fm, { is: boolean }>
  | IPCMsg<IPCEvent.Queue$fmNext, { item: NeteaseTypings.SongsItem }>;

export type NeteaseAPIKey = keyof typeof NeteaseAPI;

export type NeteaseAPIParameters<T extends NeteaseAPIKey> = Parameters<
  typeof NeteaseAPI[T]
>;

export type NeteaseAPIReturn<
  T extends NeteaseAPIKey,
  R = ReturnType<typeof NeteaseAPI[T]>,
  U = R extends PromiseLike<infer U> ? U : R
> = U;

export type NeteaseAPICMsg<
  T extends NeteaseAPIKey,
  P = NeteaseAPIParameters<T>
> = IPCMsg<IPCEvent.Api$netease, CSMessage<{ i: T; p: P }>>;

export type NeteaseAPISMsg<T extends NeteaseAPIKey> = IPCMsg<
  IPCEvent.Api$netease,
  CSMessage<NeteaseAPIReturn<T>>
>;
