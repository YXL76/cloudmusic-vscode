import { CACHE_DIR, LYRIC_CACHE_DIR, MUSIC_CACHE_DIR } from "./constant.js";
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import type { NeteaseTypings } from "api";
import type { Node } from "yallist";
import NodeCache from "node-cache";
import { STATE } from "./state.js";
import { Yallist } from "yallist";
import { logError } from "./utils.js";
import md5File from "md5-file";
import { resolve } from "node:path";

export const API_CACHE = new NodeCache({
  stdTTL: 300,
  checkperiod: 600,
  useClones: false,
  deleteOnExpire: true,
  enableLegacyCallbacks: false,
  maxKeys: -1,
});

type LyricCacheItem = NeteaseTypings.LyricData & { ctime: number };

class LyricCache {
  clear(): void {
    rm(LYRIC_CACHE_DIR, { recursive: true })
      .catch(() => undefined)
      .then(() => mkdir(LYRIC_CACHE_DIR, { recursive: true }))
      .catch(() => undefined);
  }

  async get(key: string): Promise<LyricCacheItem | void> {
    try {
      const path = resolve(LYRIC_CACHE_DIR, key);
      const data = <LyricCacheItem>JSON.parse((await readFile(path)).toString());
      // 7 * 24 * 60 * 60 * 1000
      if (Date.now() - data.ctime < 604800000) return data;
      rm(path, { recursive: true, force: true }).catch(() => undefined);
    } catch {}
    return;
  }

  put(key: string, data: LyricCacheItem): void {
    writeFile(resolve(LYRIC_CACHE_DIR, key), Buffer.from(JSON.stringify(data), "utf8")).catch(() => undefined);
  }
}

export const LYRIC_CACHE = new LyricCache();

type MusicCacheNode = {
  name: string;
  key: string;
  size: number;
};

class MusicCache {
  #size = 0;

  readonly #list = new Yallist<MusicCacheNode>();

  readonly #cache = new Map<string, Node<MusicCacheNode>>();

  readonly #listPath = resolve(CACHE_DIR, "music-list");

  async init(): Promise<void> {
    const names = new Set(
      (await readdir(MUSIC_CACHE_DIR, { withFileTypes: true })).filter((i) => i.isFile()).map(({ name }) => name),
    );

    try {
      const list = <readonly MusicCacheNode[]>JSON.parse((await readFile(this.#listPath)).toString());

      list
        .filter(({ name }) => names.has(name))
        .reverse()
        .forEach((value) => {
          names.delete(value.name);
          this.#addNode(value);
        });
    } catch {}
    this.store().catch(logError);

    for (const name of names) {
      const path = resolve(MUSIC_CACHE_DIR, name);
      rm(path, { recursive: true, force: true }).catch(logError);
    }
  }

  clear(): void {
    rm(MUSIC_CACHE_DIR, { recursive: true })
      .catch(() => undefined)
      .then(() => mkdir(MUSIC_CACHE_DIR, { recursive: true }))
      .catch(() => undefined);
    this.#cache.clear();
    this.#size = 0;
    while (this.#list.length) this.#list.pop();
    this.store().catch(logError);
  }

  store(): Promise<void> {
    const json = JSON.stringify(this.#list.toArray());
    return writeFile(this.#listPath, json);
  }

  get(key: string): string | void {
    const node = this.#cache.get(key);
    if (node) {
      this.#list.unshiftNode(node);
      return resolve(MUSIC_CACHE_DIR, node.value.name);
    }
  }

  async put(key: string, name: string, path: string, md5?: string): Promise<string | void> {
    try {
      if (!md5 || (await md5File(path)) === md5) {
        const target = resolve(MUSIC_CACHE_DIR, name);
        await copyFile(path, target);
        const { size } = await stat(target);
        this.#deleteNode({ key, name });
        this.#addNode({ key, name, size });
        return target;
      }
    } catch {}
  }

  #addNode(value: MusicCacheNode) {
    this.#list.unshift(value);
    if (!this.#list.head) return;
    this.#cache.set(value.key, this.#list.head);
    this.#size += value.size;
    while (this.#size > STATE.cacheSize) {
      const { tail } = this.#list;
      if (tail) this.#deleteNode(tail.value);
      else void this.clear();
    }
  }

  #deleteNode({ key, name }: { key: string; name: string }) {
    const node = this.#cache.get(key);
    if (node) {
      this.#list.removeNode(node);
      this.#cache.delete(key);
      this.#size -= node.value.size;
      rm(resolve(MUSIC_CACHE_DIR, name), { recursive: true, force: true }).catch(logError);
    }
  }
}

export const MUSIC_CACHE = new MusicCache();
