import { FileType, Uri, commands, env, window, workspace } from "vscode";
import type { LocalFileTreeItem, LocalLibraryTreeItem } from "../treeview";
import { LocalProvider, QueueProvider } from "../treeview";
import type { ExtensionContext } from "vscode";
import { LOCAL_FOLDER_KEY } from "../constant";
import { PersonalFm } from "../state";
import { isAbsolute } from "path";
import { load } from "../util";

export function initLocal(context: ExtensionContext) {
  LocalProvider.folders =
    context.globalState.get<string[]>(LOCAL_FOLDER_KEY) || [];

  const localProvider = LocalProvider.getInstance();
  window.registerTreeDataProvider("local", localProvider);

  commands.registerCommand("cloudmusic.newLocalLibrary", async () => {
    const path = await window.showInputBox();
    if (!path || !isAbsolute(path)) return;
    try {
      const { type } = await workspace.fs.stat(Uri.file(path));
      if (type === FileType.Directory) {
        if (!LocalProvider.folders.includes(path)) {
          LocalProvider.folders.push(path);
          await context.globalState.update(
            LOCAL_FOLDER_KEY,
            LocalProvider.folders
          );
          LocalProvider.refresh();
        }
      }
    } catch {}
  });

  commands.registerCommand("cloudmusic.refreshLocalLibrary", () =>
    LocalProvider.refresh()
  );

  commands.registerCommand(
    "cloudmusic.deleteLocalLibrary",
    ({ label }: LocalLibraryTreeItem) => {
      LocalProvider.folders.splice(LocalProvider.folders.indexOf(label), 1);
      LocalProvider.refresh();
    }
  );

  commands.registerCommand(
    "cloudmusic.openLocalLibrary",
    ({ label }: LocalLibraryTreeItem) => void env.openExternal(Uri.file(label))
  );

  commands.registerCommand(
    "cloudmusic.playLocalLibrary",
    ({ label }: LocalLibraryTreeItem) =>
      QueueProvider.refresh(() => {
        void PersonalFm.set(false);
        QueueProvider.clear();
        QueueProvider.add(
          LocalProvider.files.get(label) as LocalFileTreeItem[]
        );
        void load(QueueProvider.songs[0]);
      })
  );

  commands.registerCommand(
    "cloudmusic.addLocalLibrary",
    ({ label }: LocalLibraryTreeItem) =>
      QueueProvider.refresh(() =>
        QueueProvider.add(LocalProvider.files.get(label) as LocalFileTreeItem[])
      )
  );

  commands.registerCommand(
    "cloudmusic.refreshLocalFile",
    (element: LocalLibraryTreeItem) => LocalProvider.refresh(element)
  );

  commands.registerCommand(
    "cloudmusic.addLocalFile",
    (element: LocalFileTreeItem) =>
      QueueProvider.refresh(() => QueueProvider.add([element]))
  );

  commands.registerCommand(
    "cloudmusic.playLocalFile",
    (element: LocalFileTreeItem) =>
      QueueProvider.refresh(() => {
        void PersonalFm.set(false);
        QueueProvider.clear();
        QueueProvider.add([element]);
        void load(QueueProvider.songs[0]);
      })
  );
}
