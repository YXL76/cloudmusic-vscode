import { AccountManager, ButtonManager } from "./manager";
import { AccountViewProvider, IPC, State } from "./utils";
import {
  initAccount,
  initCache,
  initCommand,
  initIPC,
  initLocal,
  initPlayer,
  initPlaylist,
  initQueue,
  initRadio,
  initStatusBar,
  initViewProvide,
} from "./activate";
import type { ExtensionContext } from "vscode";
import { SETTING_DIR } from "./constant";
import { mkdirSync } from "fs";

export async function activate(context: ExtensionContext): Promise<void> {
  try {
    mkdirSync(SETTING_DIR);
  } catch {}
  AccountViewProvider.context = context;
  AccountManager.context = context;
  ButtonManager.context = context;
  State.context = context;
  State.init();
  initQueue(context);
  initCommand(context);
  initStatusBar(context);
  initViewProvide(context);
  await initIPC(context);
  initPlayer();
  initLocal(context);
  initCache(context);
  initPlaylist(context);
  initRadio(context);
  await initAccount(context);
}

export function deactivate(): void {
  if (State.master) IPC.retain();
  // IPC.disconnect();
}
