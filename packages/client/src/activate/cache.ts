import { CACHE_KEY, LYRIC_CACHE_KEY, MUSIC_CACHE_DIR_NAME } from "../constant";
import type { ExtensionContext } from "vscode";
import { IPC } from "../util";

export function initCache(context: ExtensionContext): void {
  try {
    if (context.globalState.get(CACHE_KEY) !== MUSIC_CACHE_DIR_NAME)
      IPC.music();
    void context.globalState.update(CACHE_KEY, MUSIC_CACHE_DIR_NAME);
  } catch {}
  if (!context.globalState.get(LYRIC_CACHE_KEY)) IPC.lyric();
  void context.globalState.update(LYRIC_CACHE_KEY, LYRIC_CACHE_KEY);
}
