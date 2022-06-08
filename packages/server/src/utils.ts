import { MusicCache } from "./cache";
import { NeteaseAPI } from "./api";
import type { Readable } from "stream";
import { STATE } from "./state";
import { TMP_DIR } from "./constant";
import { createWriteStream } from "fs";
import got from "got";
import { resolve } from "path";

export const logError = (err: unknown): void =>
  console.error(
    new Date().toISOString(),
    typeof err === "object"
      ? (err as Partial<Error>)?.stack ||
          (err as Partial<Error>)?.message ||
          err
      : err
  );

export async function getMusicPath(
  id: number,
  name: string,
  wasm?: boolean
): Promise<string> {
  const idS = `${id}`;
  const cachaUrl = MusicCache.get(idS);
  if (cachaUrl) return cachaUrl;

  const { url, md5 } = await NeteaseAPI.songUrl(idS);
  if (!url) return Promise.reject();
  const tmpUri = resolve(TMP_DIR, idS);

  let cache;
  if (!STATE.fm) cache = { id: idS, name: `${name}-${idS}`, path: tmpUri, md5 };
  const download = getMusic(url, cache);
  if (!download) return Promise.reject();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      download.destroy();
      reject();
    }, 30000);

    const ret = () => {
      clearTimeout(timer);
      resolve(tmpUri);
    };

    let len = 0;
    const onData = ({ length }: { length: number }) => {
      len += length;
      if (len > STATE.minSize) {
        download.removeListener("data", onData);
        ret();
      }
    };

    const file = createWriteStream(tmpUri);
    if (wasm) file.once("finish", () => ret());
    else download.on("data", onData);
    download.once("error", reject).pipe(file);
  });
}

function getMusic(
  url: string,
  cache?: { id: string; name: string; path: string; md5?: string }
): Readable | void {
  try {
    const data = got(url, {
      isStream: true,
      timeout: { response: 8000 },
    });
    if (cache) {
      const { id, name, path, md5 } = cache;
      data.on("end", () => void MusicCache.put(id, name, path, md5));
    }
    return data;
  } catch (err) {
    logError(err);
  }
  return;
}

export function downloadMusic(
  url: string,
  path: string,
  cache?: { id: string; name: string; path: string; md5?: string }
) {
  if (cache) cache.path = path;
  const download = getMusic(url, cache);
  if (!download) return;
  const file = createWriteStream(path);
  download.pipe(file);
}
