import { CACHE_DIR, MUSIC_CACHE_DIR_NAME } from "../constant";
import { Uri, workspace } from "vscode";
import { MusicCache } from "../util";

export function initCache(): void {
  void (async () => {
    try {
      const musicCache = Uri.joinPath(CACHE_DIR, "music");
      const items = await workspace.fs.readDirectory(musicCache);
      for (const item of items)
        if (item[0] !== MUSIC_CACHE_DIR_NAME)
          void workspace.fs.delete(Uri.joinPath(musicCache, item[0]), {
            recursive: true,
            useTrash: false,
          });
    } catch {}
    await MusicCache.init();
  })();
}
