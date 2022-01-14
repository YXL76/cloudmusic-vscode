import { CACHE_KEY, LYRIC_CACHE_KEY, MUSIC_CACHE_DIR_NAME } from "../constant";
import type { ExtensionContext } from "vscode";
import { IPC } from "../utils";
import { workspace } from "vscode";

export function initCache(context: ExtensionContext): void {
  const updateMQ = () => {
    if (context.globalState.get<string>(CACHE_KEY) !== MUSIC_CACHE_DIR_NAME())
      IPC.cache();
    void context.globalState.update(CACHE_KEY, MUSIC_CACHE_DIR_NAME());
  };

  updateMQ();

  if (!context.globalState.get(LYRIC_CACHE_KEY)) IPC.lyric();
  void context.globalState.update(LYRIC_CACHE_KEY, LYRIC_CACHE_KEY);

  context.subscriptions.push(
    workspace.onDidChangeConfiguration(({ affectsConfiguration }) => {
      if (affectsConfiguration("cloudmusic")) {
        updateMQ();
        IPC.setting();
      }
    })
  );
}
