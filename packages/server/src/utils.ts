import { MUSIC_CACHE } from "./cache";
import { STATE } from "./state";
import { TMP_DIR } from "./constant";
import { createWriteStream } from "node:fs";
import { got } from "got";
import { resolve } from "node:path";
import { rm } from "node:fs/promises";
import { songUrl } from "./api/netease";

export const logError = (err: unknown): void =>
  console.error(
    new Date().toISOString(),
    typeof err === "object" ? (<Partial<Error>>err)?.stack || (<Partial<Error>>err)?.message || err : err
  );

const gotConfig = <const>{ isStream: true, http2: true, timeout: { response: 8000 } };

export async function getMusicPath(id: number, name: string, all: boolean): Promise<string> {
  const idS = `${id}`;
  const cachaUrl = MUSIC_CACHE.get(idS);
  if (cachaUrl) return cachaUrl;

  const { url, md5 } = await songUrl(id);
  if (!url) throw Error();
  const tmpUri = resolve(TMP_DIR, idS);
  const download = got(url, gotConfig).once("end", () => void MUSIC_CACHE.put(idS, `${name}-${idS}`, tmpUri, md5));

  return new Promise((resolve, reject) => {
    const guard = setTimeout(() => reject(void download.destroy()), 32000);

    const finish = () => {
      clearTimeout(guard);
      resolve(tmpUri);
    };

    const file = createWriteStream(tmpUri);
    if (all) file.once("finish", finish);
    else {
      let len = 0;
      const onData = ({ length }: { length: number }) => {
        len += length;
        if (len > STATE.minSize) {
          download.removeListener("data", onData);
          finish();
        }
      };
      download.on("data", onData);
    }
    download.once("error", reject).pipe(file);
  });
}

export async function getMusicPathClean(id: number, name: string): Promise<void> {
  const idS = `${id}`;
  if (MUSIC_CACHE.get(idS)) return;
  const { url, md5 } = await songUrl(id);
  if (!url) return;

  const tmpUri = resolve(TMP_DIR, idS);
  const file = createWriteStream(tmpUri);
  got(url, gotConfig)
    .once("end", () => void MUSIC_CACHE.put(idS, `${name}-${idS}`, tmpUri, md5).then(() => rm(tmpUri, { force: true })))
    .pipe(file);
}

export function downloadMusic(url: string, path: string) {
  try {
    const file = createWriteStream(path);
    got(url, gotConfig).pipe(file);
  } catch {}
}
