import { MusicCache, NeteaseAPI, State } from ".";
import type { Readable } from "stream";
import { TMP_DIR } from "@cloudmusic/shared";
import axios from "axios";
import { createWriteStream } from "fs";
import { resolve } from "path";

export const logError = (err: unknown): void => console.error(Date.now(), err);

export async function getMusicPath(
  data:
    | { url: string; local: true }
    | { dt: number; id: number; pid: number; local?: undefined; next?: number }
): Promise<string | void> {
  if (data?.local) return data.url;

  const idS = `${data.id}`;
  const cachaUrl = MusicCache.get(idS);
  if (cachaUrl) return cachaUrl;

  const { url, md5 } = await NeteaseAPI.songUrl(idS);
  if (!url) return;

  const tmpUri = resolve(TMP_DIR, idS);
  const download = await getMusic(url, idS, tmpUri, !State.fm, md5);
  if (!download) return;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      download.destroy();
      resolve();
    }, 30000);

    let len = 0;
    const onData = ({ length }: { length: number }) => {
      len += length;
      if (len > State.minSize) {
        download.removeListener("data", onData);
        clearTimeout(timer);
        resolve(tmpUri);
      }
    };

    download.on("data", onData);
    download.once("error", () => resolve());
    const file = createWriteStream(tmpUri);
    download.pipe(file);
  });
}

export async function getMusic(
  url: string,
  fn: string,
  path: string,
  cache: boolean,
  md5?: string
): Promise<Readable | void> {
  try {
    const { data } = await axios.get<Readable>(url, {
      responseType: "stream",
      timeout: 8000,
    });
    if (cache) data.on("end", () => void MusicCache.put(fn, path, md5));
    return data;
  } catch {}
  return;
}

export async function downloadMusic(
  url: string,
  fn: string,
  path: string,
  cache: boolean,
  md5?: string
): Promise<void> {
  const download = await getMusic(url, fn, path, cache, md5);
  if (!download) return;
  const file = createWriteStream(path);
  download.pipe(file);
}
