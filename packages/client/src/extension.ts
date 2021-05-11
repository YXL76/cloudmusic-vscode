import { AccountManager, ButtonManager } from "./manager";
import { IPC, State } from "./util";
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

export async function activate(context: ExtensionContext): Promise<void> {
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
  IPC.disconnect();
}
