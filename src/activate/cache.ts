import { CACHE_KEY, LYRIC_CACHE_KEY, MUSIC_CACHE_DIR_NAME } from "../constant";
import { LyricCache, MusicCache } from "../util";
import type { ExtensionContext } from "vscode";

export async function initCache(context: ExtensionContext): Promise<void> {
  try {
    if (context.globalState.get(CACHE_KEY) !== MUSIC_CACHE_DIR_NAME)
      await MusicCache.clear();
    void context.globalState.update(CACHE_KEY, MUSIC_CACHE_DIR_NAME);
  } catch {}
  await MusicCache.init();
  if (!context.globalState.get(LYRIC_CACHE_KEY)) void LyricCache.clear();
  await context.globalState.update(LYRIC_CACHE_KEY, LYRIC_CACHE_KEY);
}
