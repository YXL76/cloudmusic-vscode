import {
  LYRIC_CACHE_DIR,
  LruCacheValue,
  LyricData,
  MUSIC_CACHE_DIR,
  MUSIC_CACHE_SIZE,
} from "../constant";
import { readFileSync } from "fs";
import cacache = require("cacache");
import LRU = require("lru-cache");

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

  static async get(key: string): Promise<string | undefined> {
    try {
      const { path } = await cacache.get.info(MUSIC_CACHE_DIR, key);
      this.lruCache.get(key);
      return path;
    } catch {}
    return undefined;
  }

  static async put(key: string, path: string, md5: string): Promise<void> {
    try {
      await cacache.put(MUSIC_CACHE_DIR, key, readFileSync(path), {
        integrity: md5,
      });
      const { integrity, size } = await cacache.get.info(MUSIC_CACHE_DIR, key);
      this.lruCache.set(key, { integrity, size });
    } catch {}
  }
}

export class LyricCache {
  static verify(): void {
    cacache.verify(LYRIC_CACHE_DIR);
  }

  static clear(): void {
    cacache.rm.all(LYRIC_CACHE_DIR);
  }

  static async get(key: string): Promise<LyricData | undefined> {
    try {
      const { path, time, integrity } = await cacache.get.info(
        LYRIC_CACHE_DIR,
        key
      );
      // 7 * 24 * 60 * 60 * 1000
      if (Date.now() - time < 604800000) {
        return JSON.parse(readFileSync(path, "utf8"));
      } else {
        cacache.rm.entry(LYRIC_CACHE_DIR, key);
        cacache.rm.content(LYRIC_CACHE_DIR, integrity);
      }
    } catch {}
    return undefined;
  }

  static put(key: string, data: LyricData): void {
    cacache.put(LYRIC_CACHE_DIR, key, JSON.stringify(data));
  }
}
