import {
  CONF,
  FOREIGN,
  HTTPS_API,
  MUSIC_CACHE_SIZE,
  MUSIC_QUALITY,
  ipcBroadcastServerPath,
  ipcServerPath,
} from "../constant";
import type { CSConnPool, IPCBroadcastMsg, IPCClientMsg, IPCServerMsg } from "@cloudmusic/shared";
import { IPCApi, IPCControl, IPCPlayer, IPCQueue, ipcDelimiter } from "@cloudmusic/shared";
import { LocalFileTreeItem, QueueProvider } from "../treeview";
import type { NeteaseAPICMsg, NeteaseAPIKey, NeteaseAPIParameters, NeteaseAPIReturn } from "@cloudmusic/server";
import type { PlayTreeItemData } from "../treeview";
import type { Socket } from "node:net";
import { State } from "./index";
import { connect } from "node:net";

class IPCClient<T, U = T> {
  private _buffer = "";

  private _socket?: Socket;

  constructor(private readonly _path: string) {}

  connect(handler: (data: U) => void, retry: number): Promise<boolean> {
    if (this._socket?.readable && this._socket.writable) return Promise.resolve(true);
    else this.disconnect();
    return new Promise(
      (resolve) =>
        void this._tryConnect(retry)
          .then((socket) => {
            if (!socket) throw new Error();

            this._socket = socket
              .on("data", (data) => {
                const buffer = this._buffer + data.toString();
                const msgs = buffer.split(ipcDelimiter);
                this._buffer = msgs.pop() ?? "";
                for (const msg of msgs) handler(JSON.parse(msg) as U);
              })
              .on("close", () => this.disconnect())
              .on("error", console.error);

            resolve(true);
          })
          .catch(() => resolve(false))
    );
  }

  disconnect() {
    this._socket?.destroy();
    this._socket = undefined;
  }

  send(data: T): void {
    this._socket?.write(`${JSON.stringify(data)}${ipcDelimiter}`);
  }

  request<D>(data: D): void {
    this._socket?.write(`${JSON.stringify(data)}${ipcDelimiter}`);
  }

  private _tryConnect(retry: number): Promise<Socket | undefined> {
    return new Promise((resolve) => {
      const setTimer = (remain: number) => {
        const socket = connect({ path: this._path }).setEncoding("utf8");
        const listener = () => {
          socket.destroy();
          if (remain > 0) setTimeout(() => setTimer(remain - 1), 512);
          else resolve(undefined);
        };
        socket
          .on("error", ({ message }) => console.error(message))
          .once("connect", () => {
            setTimeout(() => resolve(socket), 512);
            socket.off("close", listener);
          })
          .once("close", listener);
      };
      if (retry <= 0) setTimer(0);
      else setTimeout(() => setTimer(retry), 512);
    });
  }
}

const ipc = new IPCClient<IPCClientMsg, IPCServerMsg>(ipcServerPath);
const ipcB = new IPCClient<IPCBroadcastMsg>(ipcBroadcastServerPath);

let _nextChann = 0;

export const IPC = {
  requestPool: <CSConnPool>new Map(),

  connect: (
    ipcHandler: Parameters<typeof ipc.connect>[0],
    ipcBHandler: Parameters<typeof ipcB.connect>[0],
    retry = 4
  ): Promise<[boolean, boolean]> => Promise.all([ipc.connect(ipcHandler, retry), ipcB.connect(ipcBHandler, retry)]),
  disconnect: () => {
    ipc.disconnect();
    ipcB.disconnect();
  },

  load: (play = true, seek?: number) => {
    const { playItem } = State;
    if (!playItem) return;
    ipcB.send({ t: IPCPlayer.load });

    const { data } = playItem;

    let next;
    if (!State.fm) next = QueueProvider.next?.data;
    ipc.send({
      t: IPCPlayer.load,
      url: playItem instanceof LocalFileTreeItem ? playItem.valueOf : undefined,
      item: "mainSong" in data ? data.mainSong : data,
      pid: "pid" in data ? data.pid : undefined,
      next: next && "mainSong" in next ? next.mainSong : next,
      play,
      seek,
    });
  },
  loaded: () => ipcB.send({ t: IPCPlayer.loaded }),
  deleteCache: (key: string) => ipc.send({ t: IPCControl.deleteCache, key }),
  download: (url: string, path: string) => ipc.send({ t: IPCControl.download, url, path }),
  setting: () => {
    const conf = CONF();
    ipc.send({
      t: IPCControl.setting,
      mq: MUSIC_QUALITY(conf),
      cs: MUSIC_CACHE_SIZE(conf),
      https: HTTPS_API(conf),
      foreign: FOREIGN(conf),
    });
  },
  lyric: () => ipc.send({ t: IPCControl.lyric }),
  cache: () => ipc.send({ t: IPCControl.cache }),
  neteaseAc: () => ipc.send({ t: IPCControl.netease }),
  retain: (items?: readonly PlayTreeItemData[]) => ipc.send({ t: IPCControl.retain, items }),
  // pid: () => ipc.send({ t: IPCControl.pid, pid: process.env["VSCODE_PID"] }),
  lyricDelay: (delay: number) => ipc.send({ t: IPCPlayer.lyricDelay, delay }),
  playing: (playing: boolean) => ipc.send({ t: IPCPlayer.playing, playing }),
  position: (pos: number) => ipc.send({ t: IPCPlayer.position, pos }),
  repeat: (r: boolean) => ipcB.send({ t: IPCPlayer.repeat, r }),
  stop: () => ipc.send({ t: IPCPlayer.stop }),
  toggle: () => ipc.send({ t: IPCPlayer.toggle }),
  volume: (level: number) => ipc.send({ t: IPCPlayer.volume, level }),
  speed: (speed: number) => ipc.send({ t: IPCPlayer.speed, speed }),
  seek: (seekOffset: number) => ipc.send({ t: IPCPlayer.seek, seekOffset }),
  add: (items: readonly PlayTreeItemData[], index?: number) => ipcB.send({ t: IPCQueue.add, items, index }),
  clear: () => ipcB.send({ t: IPCQueue.clear }),
  delete: (id: number | string) => ipcB.send({ t: IPCQueue.delete, id }),
  fm: (is: boolean, uid = 0) => ipc.send({ t: IPCQueue.fm, uid, is }),
  fmNext: () => ipc.send({ t: IPCQueue.fmNext }),
  new: (items?: readonly PlayTreeItemData[]) =>
    ipcB.send(
      items
        ? { t: IPCQueue.new, id: QueueProvider.id + 1, items }
        : { t: IPCQueue.new, id: QueueProvider.id, items: QueueProvider.songs }
    ),
  playSong: (id: number | string) => ipcB.send({ t: IPCQueue.play, id }),
  random: () => ipcB.send({ t: IPCQueue.new, id: QueueProvider.id + 1, items: QueueProvider.random() }),
  shift: (index: number) => ipcB.send({ t: IPCQueue.shift, index }),

  netease: <I extends NeteaseAPIKey>(i: I, p: NeteaseAPIParameters<I>): Promise<NeteaseAPIReturn<I>> => {
    const channel = ++_nextChann;
    return new Promise((resolve, reject) => {
      IPC.requestPool.set(channel, { resolve, reject });
      ipc.request<NeteaseAPICMsg<I>>({ t: IPCApi.netease, channel, msg: { i, p } });
    });
  },
};
