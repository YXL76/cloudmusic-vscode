import { AccountManager, ButtonManager } from "./manager";
import { IPC, State } from "./utils";
import { Uri, workspace } from "vscode";
import {
  initAccount,
  initCache,
  initCommand,
  initIPC,
  initLocal,
  initPlaylist,
  initQueue,
  initRadio,
  initStatusBar,
  initViewProvide,
} from "./activate";
import type { ExtensionContext } from "vscode";
import { SETTING_DIR } from "@cloudmusic/shared";

export async function activate(context: ExtensionContext): Promise<void> {
  try {
    await workspace.fs.createDirectory(Uri.file(SETTING_DIR));
  } catch {}
  AccountManager.context = context;
  ButtonManager.context = context;
  State.context = context;
  State.init();
  initQueue(context);
  initCommand(context);
  initStatusBar(context);
  initViewProvide(context);
  await initIPC(context);
  initCache(context);
  initPlaylist(context);
  initRadio(context);
  initLocal(context);
  await initAccount(context);
}

export function deactivate(): void {
  if (State.master) IPC.retain();
  // IPC.disconnect();
}
