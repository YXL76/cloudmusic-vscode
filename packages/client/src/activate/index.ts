import { AccountViewProvider, State } from "../utils";
import type { ExtensionContext } from "vscode";
import { initAccount } from "./account";
import { initCache } from "./cache";
import { initCommand } from "./command";
import { initIPC } from "./ipc";
import { initLocal } from "./local";
import { initPlaylist } from "./playlist";
import { initQueue } from "./queue";
import { initRadio } from "./radio";
import { initStatusBar } from "./statusBar";
import { window } from "vscode";

export async function realActivate(context: ExtensionContext) {
  window.registerWebviewViewProvider("account", new AccountViewProvider(), {
    webviewOptions: { retainContextWhenHidden: true },
  });
  initQueue(context);
  initCommand(context);
  initStatusBar(context);
  await initIPC(context);
  initLocal(context);
  initCache(context);
  initPlaylist(context);
  initRadio(context);
  await initAccount(context);
  State.init();
}
