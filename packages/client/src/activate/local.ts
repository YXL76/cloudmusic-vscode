import type { LocalFileTreeItem, LocalLibraryTreeItem } from "../treeview/index.js";
import { Uri, commands, env, window } from "vscode";
import type { ExtensionContext } from "vscode";
import { IPC } from "../utils/index.js";
import { LOCAL_FOLDER_KEY } from "../constant/index.js";
import { LocalProvider } from "../treeview/index.js";

export function initLocal(context: ExtensionContext): void {
  context.globalState.get<readonly string[]>(LOCAL_FOLDER_KEY)?.forEach((f) => void LocalProvider.addFolder(f));
  LocalProvider.refresh();

  context.subscriptions.push(
    commands.registerCommand("cloudmusic.newLocalLibrary", async () => {
      const path = (
        await window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false })
      )?.shift()?.fsPath;
      if (!path) return;
      const folders = await LocalProvider.addFolder(path);
      if (folders) await context.globalState.update(LOCAL_FOLDER_KEY, folders);
    }),

    commands.registerCommand("cloudmusic.refreshLocalLibrary", () => LocalProvider.refresh()),

    commands.registerCommand("cloudmusic.deleteLocalLibrary", ({ label }: LocalLibraryTreeItem) => {
      const folders = LocalProvider.deleteFolder(label);
      if (folders !== undefined) void context.globalState.update(LOCAL_FOLDER_KEY, folders);
    }),

    commands.registerCommand(
      "cloudmusic.openLocalLibrary",
      ({ label }: LocalLibraryTreeItem) => void env.openExternal(Uri.file(label)),
    ),

    commands.registerCommand("cloudmusic.playLocalLibrary", async (element: LocalLibraryTreeItem) => {
      const items = await LocalProvider.refreshLibrary(element);
      IPC.new(items);
    }),

    commands.registerCommand("cloudmusic.addLocalLibrary", async (element: LocalLibraryTreeItem) => {
      const items = await LocalProvider.refreshLibrary(element);
      IPC.add(items);
    }),

    commands.registerCommand("cloudmusic.refreshLocalFile", (element: LocalLibraryTreeItem) =>
      LocalProvider.refreshLibrary(element, true),
    ),

    commands.registerCommand("cloudmusic.addLocalFile", ({ data }: LocalFileTreeItem) => IPC.add([data])),

    commands.registerCommand("cloudmusic.playLocalFile", ({ data }: LocalFileTreeItem) => IPC.new([data])),
  );
}
