import { CACHE_DIR, MUSIC_QUALITY, TMP_DIR } from "../constant";
import { LocalCache, MusicCache } from "../util";
import { existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import del = require("del");

export function initCache(): void {
  if (!existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR);
  }
  try {
    const pf = join(CACHE_DIR, "music");
    readdirSync(pf).forEach((folder) => {
      if (folder !== `${MUSIC_QUALITY}`) {
        const pattern = join(pf, folder);
        del.sync([pattern], { force: true });
      }
    });
  } catch {}
  MusicCache.init();
  LocalCache.init();
}
