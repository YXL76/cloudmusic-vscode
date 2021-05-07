import type { LocalFileTreeItem, LocalLibraryTreeItem } from "../treeview";
import { Uri, commands, env, window } from "vscode";
import type { ExtensionContext } from "vscode";
import { IPC } from "../util";
import { LOCAL_FOLDER_KEY } from "../constant";
import { LocalProvider } from "../treeview";

export function initLocal(context: ExtensionContext): void {
  context.globalState
    .get<string[]>(LOCAL_FOLDER_KEY)
    ?.forEach((folder) => LocalProvider.folders.push(folder));

  const localProvider = LocalProvider.getInstance();

  context.subscriptions.push(
    window.registerTreeDataProvider("local", localProvider),

    commands.registerCommand("cloudmusic.newLocalLibrary", async () => {
      const path = (
        await window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
        })
      )?.shift()?.fsPath;
      if (!path) return;
      try {
        if (!LocalProvider.folders.includes(path)) {
          LocalProvider.folders.push(path);
          await context.globalState.update(
            LOCAL_FOLDER_KEY,
            LocalProvider.folders
          );
          LocalProvider.refresh();
        }
      } catch {}
    }),

    commands.registerCommand("cloudmusic.refreshLocalLibrary", () =>
      LocalProvider.refresh()
    ),

    commands.registerCommand(
      "cloudmusic.deleteLocalLibrary",
      ({ label }: LocalLibraryTreeItem) => {
        LocalProvider.folders.splice(LocalProvider.folders.indexOf(label), 1);
        LocalProvider.refresh();
      }
    ),

    commands.registerCommand(
      "cloudmusic.openLocalLibrary",
      ({ label }: LocalLibraryTreeItem) =>
        void env.openExternal(Uri.file(label))
    ),

    commands.registerCommand(
      "cloudmusic.playLocalLibrary",
      (element: LocalLibraryTreeItem) =>
        LocalProvider.refresh(element, (items) =>
          IPC.new(items.map(({ data }) => data))
        )
    ),

    commands.registerCommand(
      "cloudmusic.addLocalLibrary",
      (element: LocalLibraryTreeItem) =>
        LocalProvider.refresh(element, (items) =>
          IPC.add(items.map(({ data }) => data))
        )
    ),

    commands.registerCommand(
      "cloudmusic.refreshLocalFile",
      (element: LocalLibraryTreeItem) => LocalProvider.refresh(element)
    ),

    commands.registerCommand(
      "cloudmusic.addLocalFile",
      ({ data }: LocalFileTreeItem) => IPC.add([data])
    ),

    commands.registerCommand(
      "cloudmusic.playLocalFile",
      ({ data }: LocalFileTreeItem) => IPC.new([data])
    )
  );
}
