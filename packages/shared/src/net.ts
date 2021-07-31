import type { IPCEvent } from ".";
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
  | IPCMsg<IPCEvent.Play$load>
  | IPCMsg<IPCEvent.Play$repeat, { r: boolean }>
  | IPCMsg<IPCEvent.Queue$add, { items: readonly unknown[]; index?: number }>
  | IPCMsg<IPCEvent.Queue$clear>
  | IPCMsg<IPCEvent.Queue$delete, { id: string | number }>
  | IPCMsg<IPCEvent.Queue$new, { items: readonly unknown[]; id?: number }>
  | IPCMsg<IPCEvent.Queue$play, { id: string | number }>
  | IPCMsg<IPCEvent.Queue$shift, { index: number }>;

export type IPCClientMsg =
  | IPCMsg<IPCEvent.Control$deleteCache, { key: string }>
  | IPCMsg<IPCEvent.Control$download, { url: string; path: string }>
  | IPCMsg<
      IPCEvent.Control$init,
      {
        mq: number;
        cs: number;
        volume?: number;
        https: boolean;
        foreign: boolean;
      }
    >
  | IPCMsg<IPCEvent.Control$lyric>
  | IPCMsg<IPCEvent.Control$music>
  | IPCMsg<IPCEvent.Control$netease>
  | IPCMsg<IPCEvent.Control$retain, { items: readonly unknown[] }>
  | IPCMsg<IPCEvent.Play$load, { url: string; local: true }>
  | IPCMsg<
      IPCEvent.Play$load,
      { dt: number; id: number; pid: number; next: number | undefined }
    >
  | IPCMsg<IPCEvent.Play$lyricDelay, { delay: number }>
  | IPCMsg<IPCEvent.Play$position, { pos: number }>
  | IPCMsg<IPCEvent.Play$stop>
  | IPCMsg<IPCEvent.Play$toggle>
  | IPCMsg<IPCEvent.Play$volume, { level: number }>
  | IPCMsg<IPCEvent.Queue$fm, { is: boolean }>
  | IPCMsg<IPCEvent.Queue$fmNext>
  | IPCMsg<IPCEvent.Wasm$init, { wasm: boolean; name?: string }>;

export type IPCServerMsg =
  | IPCMsg<IPCEvent.Control$master, { is?: true }>
  | IPCMsg<
      IPCEvent.Control$netease,
      {
        cookies: { uid: number; cookie: string }[];
        profiles: NeteaseTypings.Profile[];
      }
    >
  | IPCMsg<IPCEvent.Control$new>
  | IPCMsg<IPCEvent.Control$retain, { items: readonly unknown[] }>
  | IPCMsg<IPCEvent.Play$end, { fail?: true }>
  | IPCMsg<IPCEvent.Play$load>
  | IPCMsg<IPCEvent.Play$lyric, { lyric: NeteaseTypings.LyricData }>
  | IPCMsg<IPCEvent.Play$lyricIndex, { oi: number; ti: number }>
  | IPCMsg<IPCEvent.Play$pause>
  | IPCMsg<IPCEvent.Play$play>
  | IPCMsg<IPCEvent.Play$stop>
  | IPCMsg<IPCEvent.Play$volume, { level: number }>
  | IPCMsg<IPCEvent.Queue$fm, { is: boolean }>
  | IPCMsg<IPCEvent.Queue$fmNext, { item: NeteaseTypings.SongsItem }>
  | IPCMsg<IPCEvent.Wasm$load, { path: string }>
  | IPCMsg<IPCEvent.Wasm$pause>
  | IPCMsg<IPCEvent.Wasm$play>
  | IPCMsg<IPCEvent.Wasm$stop>
  | IPCMsg<IPCEvent.Wasm$volume, { level: number }>;
