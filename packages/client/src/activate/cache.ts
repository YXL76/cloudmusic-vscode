import { CACHE_KEY, CONF, LYRIC_CACHE_KEY, MUSIC_QUALITY } from "../constant/index.js";
import type { ExtensionContext } from "vscode";
import { IPC } from "../utils/index.js";
import { workspace } from "vscode";

export function initCache(context: ExtensionContext): void {
  const updateMQ = () => {
    const MQ = `${MUSIC_QUALITY(CONF())}`;
    if (context.globalState.get<string>(CACHE_KEY) !== MQ) IPC.cache();
    void context.globalState.update(CACHE_KEY, MQ);
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
    }),
  );
}
