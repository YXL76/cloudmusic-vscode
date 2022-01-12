import { AccountManager, ButtonManager } from "./manager";
import { BUTTON_KEY, SETTING_DIR } from "./constant";
import { IPC, State } from "./utils";
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
import { QueueProvider } from "./treeview";
import { mkdirSync } from "fs";

export async function activate(context: ExtensionContext): Promise<void> {
  // From https://github.com/tc39/proposal-relative-indexing-method#polyfill
  {
    type AtFn<T> = (this: Array<T>, n: number) => T;
    const value: AtFn<unknown> = function (n: number) {
      if (n < 0) n += this.length;
      return this[n];
    };
    Object.defineProperty(Array.prototype, "at", {
      value,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }

  /* process.setUncaughtExceptionCaptureCallback(({ message }) =>
    console.error(message)
  ); */
  process.on("unhandledRejection", console.error);
  context.globalState.setKeysForSync([BUTTON_KEY]);
  try {
    mkdirSync(SETTING_DIR);
  } catch {}
  AccountManager.context = context;
  ButtonManager.context = context;
  State.context = context;
  initViewProvide(context);
  initQueue(context);
  initCommand(context);
  initStatusBar(context);
  await initIPC(context);
  await initPlayer(context);
  initLocal(context);
  initCache(context);
  initPlaylist(context);
  initRadio(context);
  await initAccount(context);
  State.init();
}

export function deactivate(): void {
  if (State.master) IPC.retain(QueueProvider.songs);
  IPC.disconnect();
}
