import type { Event, ExtensionContext, TreeDataProvider } from "vscode";
import {
  EventEmitter,
  FileType,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  workspace,
} from "vscode";
import { fromFile } from "file-type";
import { resolve } from "path";

export class LocalProvider
  implements TreeDataProvider<LocalFileTreeItem | LocalFolderTreeItem> {
  static context: ExtensionContext;

  private static instance: LocalProvider;

  _onDidChangeTreeData: EventEmitter<LocalFolderTreeItem | void> = new EventEmitter<LocalFolderTreeItem | void>();

  readonly onDidChangeTreeData: Event<LocalFolderTreeItem | void> = this
    ._onDidChangeTreeData.event;

  static getInstance() {
    return this.instance || (this.instance = new LocalProvider());
  }

  getTreeItem(element: LocalFileTreeItem | LocalFolderTreeItem) {
    return element;
  }

  async getChildren(element?: LocalFolderTreeItem) {
    if (element) {
      const files = await workspace.fs.readDirectory(Uri.file(element.label));
      return (
        await Promise.all(
          files
            .filter(([_, type]) => type === FileType.File)
            .map(async ([filename]) => ({
              filename,
              ...(await fromFile(resolve(element.label, filename))),
            }))
        )
      )
        .filter(
          ({ mime }) =>
            mime && (mime === "audio/x-flac" || mime === "audio/mpeg")
        )
        .map(
          ({ filename, ext }) =>
            new LocalFileTreeItem(filename, ext, TreeItemCollapsibleState.None)
        );
    }
    return (
      LocalProvider.context.globalState.get<string[]>("localFolder") || []
    ).map(
      (folder) =>
        new LocalFolderTreeItem(folder, TreeItemCollapsibleState.Collapsed)
    );
  }
}

export class LocalFileTreeItem extends TreeItem {
  tooltip = this.label;

  iconPath = new ThemeIcon("zap");

  contextValue = "LocalFileTreeItem";

  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }

  valueOf() {}
}

export class LocalFolderTreeItem extends TreeItem {
  tooltip = this.label;

  iconPath = new ThemeIcon("selection");

  contextValue = "LocalFolderTreeItem";

  constructor(
    public readonly label: string,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}
