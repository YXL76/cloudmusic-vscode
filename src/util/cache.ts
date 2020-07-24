import { readFileSync } from "fs";
import { LruCacheValue } from "../constant/type";
import { CACHE_DIR, CACHE_SIZE } from "../constant/setting";
const cacache = require("cacache");
const LRU = require("lru-cache");

export class Cache {
  static lruCache = new LRU({
    max: CACHE_SIZE,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    length: (n: LruCacheValue, _key: string) => n.size,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dispose: (key: string, n: LruCacheValue) => {
      cacache.rm.entry(CACHE_DIR, key);
      cacache.rm.content(CACHE_DIR, n.integrity);
    },
    noDisposeOnSet: true,
  });

  static init(): void {
    cacache.ls(CACHE_DIR).then((res: { key: LruCacheValue }) => {
      for (const item in res) {
        const { key, integrity, size } = res[item];
        this.lruCache.set(key, { integrity, size });
      }
    });
  }

  static verify(): void {
    cacache.verify(CACHE_DIR);
  }

  static async get(key: string): Promise<string> {
    try {
      const { path } = await cacache.get.info(CACHE_DIR, key);
      this.lruCache.get(key);
      return path;
    } catch {
      return "";
    }
  }

  static async put(key: string, path: string, md5: string): Promise<void> {
    await cacache.put(CACHE_DIR, key, readFileSync(path), {
      integrity: md5,
    });
    const { integrity, size } = await cacache.get.info(CACHE_DIR, key);
    Cache.lruCache.set(key, { integrity, size });
  }
}
