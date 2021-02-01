import {
  EventEmitter,
  FileType,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  workspace,
} from "vscode";
import type { TreeDataProvider } from "vscode";
import { fromFile } from "file-type";
import { resolve } from "path";

export class LocalProvider
  implements TreeDataProvider<LocalFileTreeItem | LocalLibraryTreeItem> {
  static folders: string[];

  static files = new Map<string, LocalFileTreeItem[]>();

  private static instance: LocalProvider;

  _onDidChangeTreeData = new EventEmitter<LocalLibraryTreeItem | void>();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  static getInstance() {
    return this.instance || (this.instance = new LocalProvider());
  }

  static refresh(element?: LocalLibraryTreeItem) {
    if (element) {
      this.files.delete(element.label);
    }
    this.instance._onDidChangeTreeData.fire(element);
  }

  getTreeItem(element: LocalFileTreeItem | LocalLibraryTreeItem) {
    return element;
  }

  async getChildren(element?: LocalLibraryTreeItem) {
    if (element) {
      const { label } = element;
      if (LocalProvider.files.has(label)) {
        return LocalProvider.files.get(label);
      }
      try {
        const files = await workspace.fs.readDirectory(Uri.file(label));
        const items = (
          await Promise.all(
            files
              .filter(([_, type]) => type === FileType.File)
              .map(async ([filename]) => ({
                filename,
                ...(await fromFile(resolve(label, filename))),
              }))
          )
        )
          .filter(
            ({ mime }) =>
              mime && (mime === "audio/x-flac" || mime === "audio/mpeg")
          )
          .map(
            ({ filename, ext }) =>
              new LocalFileTreeItem(
                filename,
                ext,
                resolve(label, filename),
                TreeItemCollapsibleState.None
              )
          );
        LocalProvider.files.set(label, items);
        return items;
      } catch {}
      return [];
    }
    return LocalProvider.folders.map(
      (folder) =>
        new LocalLibraryTreeItem(folder, TreeItemCollapsibleState.Collapsed)
    );
  }
}

export class LocalFileTreeItem extends TreeItem {
  iconPath = new ThemeIcon("file-media");

  item = { al: { name: "" }, ar: [{ name: "" }] };

  contextValue = "LocalFileTreeItem";

  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly tooltip: string,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }

  valueOf() {
    return this.tooltip;
  }
}

export class LocalLibraryTreeItem extends TreeItem {
  tooltip = this.label;

  iconPath = new ThemeIcon("file-directory");

  contextValue = "LocalLibraryTreeItem";

  constructor(
    public readonly label: string,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}
