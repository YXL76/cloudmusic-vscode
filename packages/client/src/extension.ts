import { AUTO_START, BUTTON_KEY, NATIVE_MODULE, SETTING_DIR } from "./constant";
import { AccountManager, ButtonManager } from "./manager";
import { AccountViewProvider, IPC, State, Webview } from "./utils";
import type {
  Disposable,
  ExtensionContext,
  TreeDataProvider,
  TreeView,
  TreeViewVisibilityChangeEvent,
} from "vscode";
import {
  LocalProvider,
  PlaylistProvider,
  QueueProvider,
  RadioProvider,
} from "./treeview";
import { Uri, window, workspace } from "vscode";
import { mkdir } from "node:fs/promises";
import { realActivate } from "./activate";

export async function activate(context: ExtensionContext): Promise<void> {
  /* process.setUncaughtExceptionCaptureCallback(({ message }) =>
    console.error(message)
  ); */
  process.on("unhandledRejection", console.error);
  await mkdir(SETTING_DIR, { recursive: true }).catch();

  context.globalState.setKeysForSync([BUTTON_KEY]);
  AccountViewProvider.context = context;
  AccountManager.context = context;
  ButtonManager.context = context;
  State.context = context;
  Webview.extUri = context.extensionUri;

  // Check mode
  if (!State.wasm) {
    const buildUri = Uri.joinPath(context.extensionUri, "build");
    const files = await workspace.fs.readDirectory(buildUri);
    State.wasm = files.findIndex(([file]) => file === NATIVE_MODULE) === -1;
    if (!State.wasm) State.downInit(); // 3
  }
  console.log("Cloudmusic:", State.wasm ? "wasm" : "native", "mode.");

  const createTreeView = <T>(
    viewId: string,
    treeDataProvider: TreeDataProvider<T> & { view: TreeView<T> }
  ) => {
    const view = window.createTreeView(viewId, { treeDataProvider });
    treeDataProvider.view = view;
    return view;
  };

  const queue = createTreeView("queue", QueueProvider.getInstance());
  const local = createTreeView("local", LocalProvider.getInstance());
  const playlist = createTreeView("playlist", PlaylistProvider.getInstance());
  const radio = createTreeView("radio", RadioProvider.getInstance());
  context.subscriptions.push(queue, local, playlist, radio);

  // Only checking the visibility of the queue treeview is enough.
  if (AUTO_START || queue.visible) {
    await realActivate(context);
  } else {
    let done = false;
    const disposables: Disposable[] = [];
    const callback = ({ visible }: TreeViewVisibilityChangeEvent) => {
      if (done || !visible) return;
      done = true;
      void realActivate(context);
      let disposable: Disposable | undefined;
      while ((disposable = disposables.pop())) disposable.dispose();
    };
    disposables.push(queue.onDidChangeVisibility(callback));
  }
}

export function deactivate(): void {
  if (State.master) IPC.retain(QueueProvider.songs);
  // On windows, the data will be lost when the PIPE is closed.
  if (process.platform !== "win32") IPC.disconnect();
}
