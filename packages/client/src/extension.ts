import { AccountManager, ButtonManager } from "./manager";
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
import { State } from "./util";

export async function activate(context: ExtensionContext): Promise<void> {
  AccountManager.context = context;
  ButtonManager.context = context;
  State.context = context;
  await initIPC(context);
  initCommand(context);
  initStatusBar(context);
  initViewProvide(context);
  initQueue(context);
  initPlaylist(context);
  initRadio(context);
  initCache(context);
  initLocal(context);
  await initAccount(context);
}

// export function deactivate(): void {}
