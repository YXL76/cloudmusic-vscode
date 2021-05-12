import {
  CACHE_DIR,
  LYRIC_CACHE_DIR,
  MUSIC_CACHE_DIR,
} from "@cloudmusic/shared";
import { State, logError } from ".";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rmdir,
  stat,
  unlink,
  writeFile,
} from "fs/promises";
import type { NeteaseTypings } from "api";
import NodeCache from "node-cache";
import Yallist from "yallist";
import md5File from "md5-file";
import { resolve } from "path";
import { writeFileSync } from "fs";

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
      void unlink(path);
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
  key: string;
  size: number;
};

export class MusicCache {
  private static size = 0;

  private static readonly list = new Yallist<MusicCacheNode>();

  private static readonly cache = new Map<
    string,
    Yallist.Node<MusicCacheNode>
  >();

  private static readonly listPath = resolve(CACHE_DIR, "music-list");

  static async init(): Promise<void> {
    const set = new Set(
      (await readdir(MUSIC_CACHE_DIR, { withFileTypes: true }))
        .filter((i) => i.isFile())
        .map(({ name }) => name)
    );
    try {
      const list = JSON.parse(
        (await readFile(this.listPath)).toString()
      ) as MusicCacheNode[];
      list
        .filter(({ key }) => set.has(key))
        .reverse()
        .forEach((value) => {
          set.delete(value.key);
          this._addNode(value);
        });
    } catch (err) {
      logError(err);
    }

    try {
      const names = [...set];
      (
        await Promise.all(
          names.map((name) => stat(resolve(MUSIC_CACHE_DIR, name)))
        )
      ).forEach(({ size }, index) =>
        this._addNode({ key: names[index], size })
      );
      this.store();
    } catch (err) {
      logError(err);
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
    this.cache.clear();
    this.size = 0;
    while (this.list.length) this.list.pop();
  }

  static store(): void {
    try {
      writeFileSync(this.listPath, JSON.stringify(this.list.toArray()));
    } catch (err) {
      logError(err);
    }
  }

  static get(key: string): string | void {
    const node = this.cache.get(key);
    if (node) {
      this.list.unshiftNode(node);
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

  static async put(key: string, path: string, md5?: string): Promise<void> {
    const target = resolve(MUSIC_CACHE_DIR, key);
    try {
      await copyFile(path, target);
      const { size } = await stat(target);
      this._deleteNode(key);
      if (!md5 || (await md5File(target)) === md5) this._addNode({ key, size });
    } catch {}
  }

  private static _addNode(value: MusicCacheNode) {
    this.list.unshift(value);
    this.cache.set(value.key, this.list.head as Yallist.Node<MusicCacheNode>);
    this.size += value.size;
    while (this.size > State.cacheSize) {
      const { tail } = this.list;
      if (tail) this._deleteNode(tail.value.key);
      else void this.clear();
    }
  }

  private static _deleteNode(key: string) {
    const node = this.cache.get(key);
    if (node) {
      this.list.removeNode(node);
      this.cache.delete(key);
      this.size -= node.value.size;
      try {
        void unlink(resolve(MUSIC_CACHE_DIR, key));
      } catch {}
    }
  }
}
