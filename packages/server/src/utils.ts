import { MUSIC_CACHE } from "./cache.js";
import { STATE } from "./state.js";
import { TMP_DIR } from "./constant.js";
import { createWriteStream } from "node:fs";
import { got } from "got";
import { resolve } from "node:path";
import { rm } from "node:fs/promises";
import { songUrl } from "./api/netease/song.js";

export const logError = (err: unknown): void => {
  if (err) {
    console.error(
      new Date().toISOString(),
      typeof err === "object" ? (<Partial<Error>>err)?.stack || (<Partial<Error>>err)?.message || err : err,
    );
  }
};

const gotConfig = <const>{ isStream: true, http2: true, timeout: { request: 80000 } };

export async function getMusicPath(id: number, name: string): Promise<string> {
  const idS = `${id}`;
  const cachaUrl = MUSIC_CACHE.get(idS);
  if (cachaUrl) return cachaUrl;

  const { url, md5 } = await songUrl(id);
  if (!url) throw Error();
  const tmpUri = resolve(TMP_DIR, idS);
  const download = got(url, gotConfig).once("end", () => void MUSIC_CACHE.put(idS, `${name}-${idS}`, tmpUri, md5));

  return new Promise((resolve, reject) => {
    const file = createWriteStream(tmpUri);
    let len = 0;
    const onData = ({ length }: { length: number }) => {
      len += length;
      if (len > STATE.minSize) {
        download.removeListener("data", onData);
        resolve(tmpUri);
      }
    };
    download
      .once("error", (err) => {
        rm(tmpUri, { force: true }).catch(() => undefined);
        reject(err);
      })
      .on("data", onData)
      .pipe(file);
  });
}

export async function getMusicPathClean(id: number, name: string): Promise<string> {
  const idS = `${id}`;
  const cachaUrl = MUSIC_CACHE.get(idS);
  if (cachaUrl) return cachaUrl;
  const { url, md5 } = await songUrl(id);
  if (!url) throw Error();

  const tmpUri = resolve(TMP_DIR, idS);
  return new Promise((resolve, reject) => {
    const file = createWriteStream(tmpUri);
    got(url, gotConfig)
      .once("error", (err) => {
        rm(tmpUri, { force: true }).catch(() => undefined);
        reject(err);
      })
      .once(
        "end",
        () =>
          void MUSIC_CACHE.put(idS, `${name}-${idS}`, tmpUri, md5).then((target) => {
            rm(tmpUri, { force: true }).catch(() => undefined);
            target ? resolve(target) : reject();
          }),
      )
      .pipe(file);
  });
}

export function downloadMusic(url: string, path: string) {
  try {
    const file = createWriteStream(path);
    got(url, gotConfig).pipe(file);
  } catch {}
}
