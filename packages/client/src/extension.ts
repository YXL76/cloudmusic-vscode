import { AUTO_START, BUTTON_KEY, NATIVE_MODULE, SETTING_DIR } from "./constant";
import { CONTEXT, IPC, STATE } from "./utils";
import type { Disposable, ExtensionContext, TreeDataProvider, TreeView, TreeViewVisibilityChangeEvent } from "vscode";
import { LocalProvider, PlaylistProvider, QueueProvider, RadioProvider } from "./treeview";
import { Uri, window, workspace } from "vscode";
import { mkdir } from "node:fs/promises";
import { realActivate } from "./activate";

export async function activate(context: ExtensionContext): Promise<void> {
  CONTEXT.context = context;
  /* process.setUncaughtExceptionCaptureCallback(({ message }) =>
    console.error(message)
  ); */
  process.on("unhandledRejection", console.error);
  await mkdir(SETTING_DIR, { recursive: true }).catch();

  context.globalState.setKeysForSync([BUTTON_KEY]);

  // Check mode
  if (!STATE.wasm) {
    const buildUri = Uri.joinPath(context.extensionUri, "build");
    const files = await workspace.fs.readDirectory(buildUri);
    STATE.wasm = files.findIndex(([file]) => file === NATIVE_MODULE) === -1;
    if (!STATE.wasm) STATE.downInit(); // 3
  }
  console.log("Cloudmusic:", STATE.wasm ? "wasm" : "native", "mode.");

  const createTreeView = <T>(viewId: string, treeDataProvider: TreeDataProvider<T> & { view: TreeView<T> }) => {
    const view = window.createTreeView(viewId, { treeDataProvider });
    treeDataProvider.view = view;
    return view;
  };

  const queue = createTreeView("cloudmusic-queue", QueueProvider.getInstance());
  const local = createTreeView("cloudmusic-local", LocalProvider.getInstance());
  const playlist = createTreeView("cloudmusic-playlist", PlaylistProvider.getInstance());
  const radio = createTreeView("cloudmusic-radio", RadioProvider.getInstance());
  context.subscriptions.push(queue, local, playlist, radio);

  // Only checking the visibility of the queue treeview is enough.
  if (AUTO_START || queue.visible) await realActivate(context);
  else {
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

export function deactivate(): Promise<void> {
  if (STATE.master) IPC.retain(QueueProvider.songs);
  // On windows, the data will be lost when the PIPE is closed.
  if (process.platform !== "win32") return Promise.resolve(IPC.disconnect());
  else return new Promise<void>((resolve) => setTimeout(() => resolve(IPC.disconnect()), 2048));
}
