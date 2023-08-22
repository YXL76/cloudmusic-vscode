import { AccountViewProvider } from "../utils/index.js";
import type { ExtensionContext } from "vscode";
import { initAccount } from "./account.js";
import { initCache } from "./cache.js";
import { initCommand } from "./command.js";
import { initIPC } from "./ipc.js";
import { initLocal } from "./local.js";
import { initPlaylist } from "./playlist.js";
import { initQueue } from "./queue.js";
import { initRadio } from "./radio.js";
import { initStatusBar } from "./statusBar.js";
import { window } from "vscode";

export async function realActivate(context: ExtensionContext) {
  context.subscriptions.push(
    window.registerWebviewViewProvider("cloudmusic-account", new AccountViewProvider(), {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );
  initQueue(context);
  initCommand(context);
  initStatusBar(context);
  await initIPC(context);
  initLocal(context);
  initCache(context);
  initPlaylist(context);
  initRadio(context);
  await initAccount(context);
}
