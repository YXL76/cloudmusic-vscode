import { CACHE_DIR, LYRIC_CACHE_DIR, MUSIC_CACHE_DIR } from "./constant";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  rmdir,
  stat,
  writeFile,
} from "fs/promises";
import type { NeteaseTypings } from "api";
import NodeCache from "node-cache";
import { State } from "./state";
import Yallist from "yallist";
import { logError } from "./utils";
import md5File from "md5-file";
import { resolve } from "path";

export const apiCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 600,
  useClones: false,
  deleteOnExpire: true,
  enableLegacyCallbacks: false,
  maxKeys: -1,
});

type LyricCacheItem = NeteaseTypings.LyricData & { ctime: number };

export class LyricCache {
  static clear(): void {
    rmdir(LYRIC_CACHE_DIR, { recursive: true })
      .catch(() => {
        //
      })
      .then(() => mkdir(LYRIC_CACHE_DIR, { recursive: true }))
      .catch(() => {
        //
      });
  }

  static async get(key: string): Promise<LyricCacheItem | void> {
    try {
      const path = resolve(LYRIC_CACHE_DIR, key);
      const data = JSON.parse(
        (await readFile(path)).toString()
      ) as LyricCacheItem;
      // 7 * 24 * 60 * 60 * 1000
      if (Date.now() - data.ctime < 604800000) return data;
      void rm(path, { recursive: true, force: true });
    } catch {}
    return;
  }

  static put(key: string, data: LyricCacheItem): void {
    try {
      void writeFile(
        resolve(LYRIC_CACHE_DIR, key),
        Buffer.from(JSON.stringify(data), "utf8")
      );
    } catch {}
  }
}

type MusicCacheNode = {
  name: string;
  key: string;
  size: number;
};

export class MusicCache {
  private static _size = 0;

  private static readonly _list = new Yallist<MusicCacheNode>();

  private static readonly _cache = new Map<
    string,
    Yallist.Node<MusicCacheNode>
  >();

  private static readonly _listPath = resolve(CACHE_DIR, "music-list");

  static async init(): Promise<void> {
    const names = new Set(
      (await readdir(MUSIC_CACHE_DIR, { withFileTypes: true }))
        .filter((i) => i.isFile())
        .map(({ name }) => name)
    );

    try {
      const list = JSON.parse(
        (await readFile(this._listPath)).toString()
      ) as readonly MusicCacheNode[];
      list
        .filter(({ name }) => names.has(name))
        .reverse()
        .forEach((value) => {
          names.delete(value.key);
          this._addNode(value);
        });
    } catch {}
    void this.store();

    for (const name of names) {
      const path = resolve(MUSIC_CACHE_DIR, name);
      rm(path, { recursive: true, force: true }).catch(logError);
    }
  }

  static clear(): void {
    rmdir(MUSIC_CACHE_DIR, { recursive: true })
      .catch(() => {
        //
      })
      .then(() => mkdir(MUSIC_CACHE_DIR, { recursive: true }))
      .catch(() => {
        //
      });
    this._cache.clear();
    this._size = 0;
    while (this._list.length) this._list.pop();
    void this.store();
  }

  static async store(): Promise<void> {
    const json = JSON.stringify(this._list.toArray());
    await writeFile(this._listPath, json).catch(logError);
  }

  static get(key: string): string | void {
    const node = this._cache.get(key);
    if (node) {
      this._list.unshiftNode(node);
      return resolve(MUSIC_CACHE_DIR, key);
    }
    /* try {
      const { type, size } = await workspace.fs.stat(path);
      if (type !== FileType.File) throw Error();
      const node = this.cache.get(key);
      if (node) {
        this.list.unshiftNode(node);
      } else {
        this.addNode({ key, size });
      }
      return path.fsPath;
    } catch {
      this.deleteNode(key);
    } 
    return; */
  }

  static async put(
    key: string,
    name: string,
    path: string,
    md5?: string
  ): Promise<void> {
    const target = resolve(MUSIC_CACHE_DIR, name);
    try {
      await copyFile(path, target);
      const { size } = await stat(target);
      this._deleteNode(key);
      if (!md5 || (await md5File(target)) === md5)
        this._addNode({ key, name, size });
    } catch {}
  }

  private static _addNode(value: MusicCacheNode) {
    this._list.unshift(value);
    this._cache.set(value.key, this._list.head as Yallist.Node<MusicCacheNode>);
    this._size += value.size;
    while (this._size > State.cacheSize) {
      const { tail } = this._list;
      if (tail) this._deleteNode(tail.value.key);
      else void this.clear();
    }
  }

  private static _deleteNode(key: string) {
    const node = this._cache.get(key);
    if (node) {
      this._list.removeNode(node);
      this._cache.delete(key);
      this._size -= node.value.size;
      void rm(resolve(MUSIC_CACHE_DIR, key), { recursive: true, force: true });
    }
  }
}
