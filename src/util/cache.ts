import { readFileSync } from "fs";
import { LruCacheValue } from "../constant/type";
import { MUSIC_CACHE_DIR, MUSIC_CACHE_SIZE } from "../constant/setting";
const cacache = require("cacache");
const LRU = require("lru-cache");

export class MusicCache {
  static lruCache = new LRU({
    max: MUSIC_CACHE_SIZE,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    length: (n: LruCacheValue, _key: string) => n.size,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dispose: (key: string, n: LruCacheValue) => {
      cacache.rm.entry(MUSIC_CACHE_DIR, key);
      cacache.rm.content(MUSIC_CACHE_DIR, n.integrity);
    },
    noDisposeOnSet: true,
  });

  static init(): void {
    cacache.ls(MUSIC_CACHE_DIR).then((res: { key: LruCacheValue }) => {
      for (const item in res) {
        const { key, integrity, size } = res[item];
        this.lruCache.set(key, { integrity, size });
      }
    });
  }

  static verify(): void {
    cacache.verify(MUSIC_CACHE_DIR);
  }

  static async get(key: string): Promise<string> {
    try {
      const { path } = await cacache.get.info(MUSIC_CACHE_DIR, key);
      this.lruCache.get(key);
      return path;
    } catch {
      return "";
    }
  }

  static async put(key: string, path: string, md5: string): Promise<void> {
    await cacache.put(MUSIC_CACHE_DIR, key, readFileSync(path), {
      integrity: md5,
    });
    const { integrity, size } = await cacache.get.info(MUSIC_CACHE_DIR, key);
    MusicCache.lruCache.set(key, { integrity, size });
  }
}
