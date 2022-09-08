import { MUSIC_CACHE } from "./cache";
import { NeteaseAPI } from "./api";
import type { Readable } from "stream";
import { STATE } from "./state";
import { TMP_DIR } from "./constant";
import { createWriteStream } from "node:fs";
import { got } from "got";
import { resolve } from "node:path";

export const logError = (err: unknown): void =>
  console.error(
    new Date().toISOString(),
    typeof err === "object" ? (<Partial<Error>>err)?.stack || (<Partial<Error>>err)?.message || err : err
  );

export async function getMusicPath(id: number, name: string, all: boolean): Promise<string> {
  const idS = `${id}`;
  const cachaUrl = MUSIC_CACHE.get(idS);
  if (cachaUrl) return cachaUrl;

  const { url, md5 } = await NeteaseAPI.songUrl(id);
  if (!url) return Promise.reject();
  const tmpUri = resolve(TMP_DIR, idS);

  const download = getMusic(url, { id: idS, name: `${name}-${idS}`, path: tmpUri, md5 });
  if (!download) return Promise.reject();

  return new Promise((resolve, reject) => {
    const guard = setTimeout(() => reject(void download.destroy()), 32000);

    const ret = () => {
      clearTimeout(guard);
      resolve(tmpUri);
    };

    const file = createWriteStream(tmpUri);
    if (all) file.once("finish", ret);
    else {
      let len = 0;
      const onData = ({ length }: { length: number }) => {
        len += length;
        if (len > STATE.minSize) {
          download.removeListener("data", onData);
          ret();
        }
      };
      download.on("data", onData);
    }
    download.once("error", reject).pipe(file);
  });
}

function getMusic(url: string, cache?: { id: string; name: string; path: string; md5?: string }): Readable | void {
  try {
    const data = got(url, { isStream: true, http2: true, timeout: { response: 8000 } });
    if (cache) {
      const { id, name, path, md5 } = cache;
      data.on("end", () => void MUSIC_CACHE.put(id, name, path, md5));
    }
    return data;
  } catch (err) {
    logError(err);
  }
}

export function downloadMusic(url: string, path: string) {
  const download = getMusic(url);
  if (!download) return;
  const file = createWriteStream(path);
  download.pipe(file);
}
