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
  wasm?: boolean
): Promise<string | void> {
  const idS = `${id}`;
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
    if (wasm) {
      file.once("finish", () => {
        file.close();
        ret();
      });
    } else download.on("data", onData);
    download.once("error", resolve).pipe(file);
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
  } catch (err) {
    logError(err);
  }
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
