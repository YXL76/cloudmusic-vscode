import {
  CACHE_KEY,
  MUSIC_CACHE_DIR,
  MUSIC_CACHE_DIR_NAME as MUSIC_CACHE_NAME,
} from "../constant";
import type { ExtensionContext } from "vscode";
import { MusicCache } from "../util";
import { workspace } from "vscode";

export async function initCache(context: ExtensionContext): Promise<void> {
  try {
    if (context.globalState.get(CACHE_KEY) !== MUSIC_CACHE_NAME)
      await workspace.fs.delete(MUSIC_CACHE_DIR, {
        recursive: true,
        useTrash: false,
      });
    void context.globalState.update(CACHE_KEY, MUSIC_CACHE_NAME);
  } catch {}
  await MusicCache.init();
}
