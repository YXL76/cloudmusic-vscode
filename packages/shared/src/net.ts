import type { IPCEvent } from ".";

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
  | IPCMsg<IPCEvent.Queue.add, { items: unknown; index?: number }>
  | IPCMsg<IPCEvent.Queue.clear>
  | IPCMsg<IPCEvent.Queue.delete, { id: string | number }>
  | IPCMsg<IPCEvent.Queue.new, { items: unknown; id?: number }>
  | IPCMsg<IPCEvent.Queue.play, { id: string | number }>
  | IPCMsg<IPCEvent.Queue.random, { items: unknown }>
  | IPCMsg<IPCEvent.Queue.shift, { index: number }>
  | IPCMsg<IPCEvent.Queue.sort, { type: number; order: number }>;

export type IPCClientMsg =
  | { t: IPCEvent.Play.load; url: string; pid?: number }
  | { t: IPCEvent.Play.stop }
  | { t: IPCEvent.Play.toggle }
  | { t: IPCEvent.Play.volume; level: number };

export type IPCServerMsg =
  | { t: IPCEvent.Play.load }
  | { t: IPCEvent.Play.pause }
  | { t: IPCEvent.Play.play }
  | { t: IPCEvent.Play.volume; level: number };
