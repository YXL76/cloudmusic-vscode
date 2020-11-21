import * as LRU from "lru-cache";
import * as NodeCache from "node-cache";
import * as cacache from "cacache";
import * as md5File from "md5-file";
import { FileType, Uri, workspace } from "vscode";
import {
  LOCAL_FILE_DIR,
  LYRIC_CACHE_DIR,
  MUSIC_CACHE_DIR,
  MUSIC_CACHE_SIZE,
} from "../constant";
import type { LruCacheValue, LyricData } from "../constant";

export const apiCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 600,
  useClones: false,
  deleteOnExpire: true,
  enableLegacyCallbacks: false,
  maxKeys: -1,
});

export class MusicCache {
  static lruCache = new LRU({
    max: MUSIC_CACHE_SIZE,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    length: (n: LruCacheValue, _key: string) => n.size,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dispose: (key: string, n: LruCacheValue) => {
      void cacache.rm.entry(MUSIC_CACHE_DIR.fsPath, key);
      void cacache.rm.content(MUSIC_CACHE_DIR.fsPath, n.integrity);
    },
    noDisposeOnSet: true,
  });

  static async init(): Promise<void> {
    try {
      const res = await cacache.ls(MUSIC_CACHE_DIR.fsPath);
      for (const item in res) {
        const { key, integrity, size } = res[item];
        this.lruCache.set(key, { integrity, size });
      }
    } catch {}
  }

  static verify(): void {
    void cacache.verify(MUSIC_CACHE_DIR.fsPath);
  }

  static async get(key: string): Promise<string | undefined> {
    try {
      const { path } = await cacache.get.info(MUSIC_CACHE_DIR.fsPath, key);
      this.lruCache.get(key);
      return path;
    } catch {}
    return undefined;
  }

  static async put(key: string, path: Uri, md5: string): Promise<void> {
    try {
      await cacache.put(
        MUSIC_CACHE_DIR.fsPath,
        key,
        await workspace.fs.readFile(path),
        { integrity: md5, algorithms: ["md5"] }
      );
      const { integrity, size } = await cacache.get.info(
        MUSIC_CACHE_DIR.fsPath,
        key
      );
      this.lruCache.set(key, { integrity, size });
    } catch {}
  }
}

export class LyricCache {
  static verify(): void {
    void cacache.verify(LYRIC_CACHE_DIR.fsPath);
  }

  static clear(): void {
    void cacache.rm.all(LYRIC_CACHE_DIR.fsPath);
  }

  static async get(key: string): Promise<LyricData | undefined> {
    try {
      const { path, time, integrity } = await cacache.get.info(
        LYRIC_CACHE_DIR.fsPath,
        key
      );
      // 7 * 24 * 60 * 60 * 1000
      if (Date.now() - time < 604800000) {
        return JSON.parse(
          Buffer.from(await workspace.fs.readFile(Uri.file(path))).toString()
        ) as LyricData;
      } else {
        void cacache.rm.entry(LYRIC_CACHE_DIR.fsPath, key);
        void cacache.rm.content(LYRIC_CACHE_DIR.fsPath, integrity);
      }
    } catch {}
    return undefined;
  }

  static put(key: string, data: LyricData): void {
    void cacache.put(LYRIC_CACHE_DIR.fsPath, key, JSON.stringify(data));
  }
}

export class LocalCache {
  private static cache = new NodeCache({
    stdTTL: 0,
    checkperiod: 0,
    useClones: false,
    deleteOnExpire: false,
    enableLegacyCallbacks: false,
    maxKeys: -1,
  });

  static async init(): Promise<void> {
    if (LOCAL_FILE_DIR) {
      try {
        const items = await workspace.fs.readDirectory(LOCAL_FILE_DIR);
        for (const item of items) {
          if (item[1] === FileType.File) {
            const path = Uri.joinPath(LOCAL_FILE_DIR, item[0]).fsPath;
            this.cache.set(
              `md5-${Buffer.from(md5File.sync(path), "hex").toString(
                "base64"
              )}`,
              path
            );
          }
        }
      } catch {}
    }
  }

  static get(key: string): string | undefined {
    const path = this.cache.get<string>(key);
    if (path) {
      return path;
    }
    return undefined;
  }
}
