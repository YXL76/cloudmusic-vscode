import { CACHE_DIR, MUSIC_QUALITY } from "../constant";
import { LocalCache, MusicCache } from "../util";
import { Uri, workspace } from "vscode";

export async function initCache(): Promise<void> {
  try {
    const musicCache = Uri.joinPath(CACHE_DIR, "music");
    const items = await workspace.fs.readDirectory(musicCache);
    for (const item of items) {
      if (item[0] !== `${MUSIC_QUALITY}`) {
        workspace.fs.delete(Uri.joinPath(musicCache, item[0]), {
          recursive: true,
          useTrash: false,
        });
      }
    }
  } catch {}
  await MusicCache.init();
  await LocalCache.init();
}
