import { join } from "path";
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

  static async get(key: string, md5: string): Promise<string> {
    try {
      const { integrity, path } = await cacache.get.info(CACHE_DIR, key);
      if (integrity === md5) {
        this.lruCache.get(key);
        return join(__dirname, path);
      }
      this.lruCache.del(key);
      cacache.rm.entry(CACHE_DIR, key);
      cacache.rm.content(CACHE_DIR, integrity);
      return "";
    } catch {
      return "";
    }
  }

  static async put(key: string, path: string): Promise<void> {
    await cacache.put(CACHE_DIR, key, readFileSync(path), {
      algorithms: ["md5"],
    });
    const { integrity, size } = await cacache.get.info(CACHE_DIR, key);
    Cache.lruCache.set(key, { integrity, size });
  }
}
