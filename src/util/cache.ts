import * as NodeCache from "node-cache";
import * as Yallist from "yallist";
import * as md5File from "md5-file";
import {
  CACHE_DIR,
  LYRIC_CACHE_DIR,
  MUSIC_CACHE_DIR,
  MUSIC_CACHE_SIZE,
} from "../constant";
import { FileType, Uri, workspace } from "vscode";
import type { LyricData, MusicCacheNode } from "../constant";
import { writeFileSync } from "fs";

export const apiCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 600,
  useClones: false,
  deleteOnExpire: true,
  enableLegacyCallbacks: false,
  maxKeys: -1,
});

export class MusicCache {
  private static size = 0;

  private static readonly list = new Yallist<MusicCacheNode>();

  private static readonly cache = new Map<
    string,
    Yallist.Node<MusicCacheNode>
  >();

  private static readonly listPath = Uri.joinPath(CACHE_DIR, "music-list");

  static async init(): Promise<void> {
    const set = new Set(
      (await workspace.fs.readDirectory(MUSIC_CACHE_DIR))
        .filter(([, type]) => type === FileType.File)
        .map(([name]) => name)
    );
    try {
      const list = JSON.parse(
        (await workspace.fs.readFile(this.listPath)).toString()
      ) as MusicCacheNode[];
      list
        .filter(({ key }) => set.has(key))
        .reverse()
        .forEach((value) => {
          set.delete(value.key);
          this.addNode(value);
        });
    } catch {}

    try {
      const names = [...set];
      (
        await Promise.all(
          names.map((name) =>
            workspace.fs.stat(Uri.joinPath(MUSIC_CACHE_DIR, name))
          )
        )
      ).forEach(({ size }, index) => this.addNode({ key: names[index], size }));
    } catch {}

    // 1000 * 60 * 16;
    // setInterval(() => this.store(), 960000);
  }

  static async clear(): Promise<void> {
    try {
      await workspace.fs.delete(MUSIC_CACHE_DIR, {
        recursive: true,
        useTrash: false,
      });
      await workspace.fs.createDirectory(MUSIC_CACHE_DIR);
    } catch {}
    this.cache.clear();
    this.size = 0;
    while (this.list.length) this.list.pop();
  }

  static store(): void {
    try {
      writeFileSync(this.listPath.fsPath, JSON.stringify(this.list.toArray()));
    } catch {}
  }

  static get(key: string): string | void {
    const node = this.cache.get(key);
    if (node) {
      this.list.unshiftNode(node);
      return Uri.joinPath(MUSIC_CACHE_DIR, key).fsPath;
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

  static async put(key: string, path: Uri, md5?: string): Promise<void> {
    const target = Uri.joinPath(MUSIC_CACHE_DIR, key);
    try {
      await workspace.fs.copy(path, target, { overwrite: true });
      const { size } = await workspace.fs.stat(target);
      this.deleteNode(key);
      if (!md5 || (await md5File(target.fsPath)) === md5)
        this.addNode({ key, size });
    } catch {}
  }

  private static addNode(value: MusicCacheNode) {
    this.list.unshift(value);
    this.cache.set(value.key, this.list.head as Yallist.Node<MusicCacheNode>);
    this.size += value.size;
    while (this.size > MUSIC_CACHE_SIZE) {
      const { tail } = this.list;
      if (tail) this.deleteNode(tail.value.key);
      else void this.clear();
    }
  }

  private static deleteNode(key: string) {
    const node = this.cache.get(key);
    if (node) {
      this.list.removeNode(node);
      this.cache.delete(key);
      this.size -= node.value.size;
      try {
        void workspace.fs.delete(Uri.joinPath(MUSIC_CACHE_DIR, key), {
          useTrash: false,
        });
      } catch {}
    }
  }
}

export class LyricCache {
  static async clear(): Promise<void> {
    await workspace.fs.delete(LYRIC_CACHE_DIR, {
      recursive: true,
      useTrash: false,
    });
    await workspace.fs.createDirectory(LYRIC_CACHE_DIR);
  }

  static async get(key: string): Promise<LyricData | void> {
    try {
      const path = Uri.joinPath(LYRIC_CACHE_DIR, key);
      const data = JSON.parse(
        (await workspace.fs.readFile(path)).toString()
      ) as LyricData;
      // 7 * 24 * 60 * 60 * 1000
      if (Date.now() - data.ctime < 604800000) return data;
      void workspace.fs.delete(path, { recursive: true, useTrash: false });
    } catch {}
    return;
  }

  static put(key: string, data: LyricData): void {
    try {
      void workspace.fs.writeFile(
        Uri.joinPath(LYRIC_CACHE_DIR, key),
        Buffer.from(JSON.stringify(data), "utf8")
      );
    } catch {}
  }
}
