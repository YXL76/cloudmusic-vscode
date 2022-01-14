import { MusicCache } from "./cache";
import { NeteaseAPI } from "./api";
import type { Readable } from "stream";
import { State } from "./state";
import { TMP_DIR } from "./constant";
import axios from "axios";
import { createWriteStream } from "fs";
import { resolve } from "path";

export const logError = (err: unknown): void =>
  console.error(
    Date.now(),
    typeof err === "object"
      ? (err as Partial<Error>)?.stack
        ? (err as Partial<Error>).stack
        : (err as Partial<Error>)?.message
        ? (err as Partial<Error>).message
        : err
      : err
  );

export async function getMusicPath(
  id: number,
  name: string,
  wasm?: boolean
): Promise<string | void> {
  const idS = `${id}`;
  const cachaUrl = MusicCache.get(idS);
  if (cachaUrl) return cachaUrl;

  const { url, md5 } = await NeteaseAPI.songUrl(idS);
  if (!url) return;
  const tmpUri = resolve(TMP_DIR, idS);

  let cache;
  if (!State.fm) cache = { id: idS, name, path: tmpUri, md5 };
  const download = await getMusic(url, cache);
  if (!download) return;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      download.destroy();
      resolve();
    }, 30000);

    const ret = () => {
      clearTimeout(timer);
      resolve(tmpUri);
    };

    let len = 0;
    const onData = ({ length }: { length: number }) => {
      len += length;
      if (len > State.minSize) {
        download.removeListener("data", onData);
        ret();
      }
    };

    const file = createWriteStream(tmpUri);
    if (wasm) file.once("finish", () => ret());
    else download.on("data", onData);
    download.once("error", resolve).pipe(file);
  });
}

async function getMusic(
  url: string,
  cache?: { id: string; name: string; path: string; md5?: string }
): Promise<Readable | void> {
  try {
    const { data } = await axios.get<Readable>(url, {
      responseType: "stream",
      timeout: 8000,
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

export async function downloadMusic(
  url: string,
  path: string,
  cache?: { id: string; name: string; path: string; md5?: string }
): Promise<void> {
  if (cache) cache.path = path;
  const download = await getMusic(url, cache);
  if (!download) return;
  const file = createWriteStream(path);
  download.pipe(file);
}
