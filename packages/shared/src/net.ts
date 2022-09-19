import type { IPCControl, IPCPlayer, IPCQueue, IPCWasm } from "./event.js";
import type { NeteaseTypings } from "api";

export type CSMessage<T = undefined, U = number> = { channel: U; msg?: T; err?: true };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CSConnPool = Map<number | string, { resolve: (value?: any) => void; reject: (reason?: string) => void }>;

export type IPCClientLoadMsg = {
  url?: string;
  item: NeteaseTypings.SongsItem;
  pid?: number;
  next?: { id: number; name: string };
  play: boolean;
  seek?: number;
};

export type IPCMsg<T = string, U = Record<never, never>> = { t: T } & U;

export type IPCBroadcastMsg =
  | IPCMsg<IPCPlayer.load>
  | IPCMsg<IPCPlayer.loaded>
  | IPCMsg<IPCPlayer.repeat, { r: boolean }>
  | IPCMsg<IPCQueue.add, { items: readonly unknown[]; index?: number }>
  | IPCMsg<IPCQueue.clear>
  | IPCMsg<IPCQueue.delete, { id: string | number }>
  | IPCMsg<IPCQueue.new, { items: readonly unknown[]; id: number }>
  | IPCMsg<IPCQueue.play, { id: string | number }>
  | IPCMsg<IPCQueue.shift, { index: number }>;

export type IPCClientMsg =
  | IPCMsg<IPCControl.deleteCache, { key: string }>
  | IPCMsg<IPCControl.download, { url: string; path: string }>
  | IPCMsg<IPCControl.setting, { mq: number; cs: number; https: boolean; foreign: boolean }>
  | IPCMsg<IPCControl.lyric>
  | IPCMsg<IPCControl.cache>
  | IPCMsg<IPCControl.netease>
  | IPCMsg<IPCControl.retain, { items?: readonly unknown[] }>
  // | IPCMsg<IPCControl.pid, { pid?: string }>
  | IPCMsg<IPCPlayer.load, IPCClientLoadMsg>
  | IPCMsg<IPCPlayer.lyricDelay, { delay: number }>
  | IPCMsg<IPCPlayer.playing, { playing: boolean }>
  | IPCMsg<IPCPlayer.position, { pos: number }>
  | IPCMsg<IPCPlayer.stop>
  | IPCMsg<IPCPlayer.toggle>
  | IPCMsg<IPCPlayer.volume, { level: number }>
  | IPCMsg<IPCPlayer.speed, { speed: number }>
  | IPCMsg<IPCPlayer.seek, { seekOffset: number }>
  | IPCMsg<IPCQueue.fm, { uid: number }>;

export type IPCServerMsg =
  | IPCMsg<IPCControl.master, { is?: true }>
  | IPCMsg<IPCControl.netease, { cookies: { uid: number; cookie: string }[]; profiles: NeteaseTypings.Profile[] }>
  | IPCMsg<IPCControl.new>
  | IPCMsg<IPCControl.retain, { items: readonly unknown[]; play?: boolean; seek?: number }>
  | IPCMsg<IPCPlayer.end, { fail?: true; pause?: boolean; reloadNseek?: number }>
  | IPCMsg<IPCPlayer.loaded>
  | IPCMsg<IPCPlayer.lyric, { lyric: NeteaseTypings.LyricData }>
  | IPCMsg<IPCPlayer.lyricIndex, { idx: number }>
  | IPCMsg<IPCPlayer.pause>
  | IPCMsg<IPCPlayer.play>
  | IPCMsg<IPCPlayer.stop>
  | IPCMsg<IPCPlayer.volume, { level: number }>
  | IPCMsg<IPCPlayer.next>
  | IPCMsg<IPCPlayer.previous>
  | IPCMsg<IPCPlayer.speed, { speed: number }>
  | IPCMsg<IPCQueue.fm, { uid: number }>
  | IPCMsg<IPCWasm.load, { path: string; play: boolean; seek?: number }>
  | IPCMsg<IPCWasm.pause>
  | IPCMsg<IPCWasm.play>
  | IPCMsg<IPCWasm.stop>
  | IPCMsg<IPCWasm.volume, { level: number }>
  | IPCMsg<IPCWasm.speed, { speed: number }>
  | IPCMsg<IPCWasm.seek, { seekOffset: number }>;
