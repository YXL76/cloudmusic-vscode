import {
  EventEmitter,
  FileType,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  workspace,
} from "vscode";
import type { PlayTreeItem, RefreshAction } from ".";
import type { TreeDataProvider } from "vscode";
import { TreeItemId } from "../constant";
import { fromFile } from "file-type";
import { resolve } from "path";

export class LocalProvider
  implements TreeDataProvider<LocalFileTreeItem | LocalLibraryTreeItem>
{
  static readonly folders: string[] = [];

  static readonly files = new Map<string, LocalFileTreeItem[]>();

  private static instance: LocalProvider;

  private static action?: RefreshAction;

  _onDidChangeTreeData = new EventEmitter<LocalLibraryTreeItem | void>();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  static getInstance(): LocalProvider {
    return this.instance || (this.instance = new LocalProvider());
  }

  static refresh(element?: LocalLibraryTreeItem, action?: RefreshAction): void {
    if (element) {
      if (action) this.action = action;
      else this.files.delete(element.label);
    }
    this.instance._onDidChangeTreeData.fire(element);
  }

  getTreeItem(
    element: LocalFileTreeItem | LocalLibraryTreeItem
  ): LocalFileTreeItem | LocalLibraryTreeItem {
    return element;
  }

  async getChildren(
    element?: LocalLibraryTreeItem
  ): Promise<(LocalFileTreeItem | LocalLibraryTreeItem)[]> {
    if (element) {
      let items: LocalFileTreeItem[] = [];
      const { label } = element;
      if (LocalProvider.files.has(label))
        items = LocalProvider.files.get(label) as LocalFileTreeItem[];
      else {
        try {
          const files = await workspace.fs.readDirectory(Uri.file(label));
          items = (
            await Promise.all(
              files
                .filter(([, type]) => type === FileType.File)
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
            .map(({ filename: fn, ext }) =>
              LocalFileTreeItem.new(fn, ext ?? "", resolve(label, fn))
            );
          LocalProvider.files.set(label, items);
        } catch {}
      }
      const localAction = LocalProvider.action;
      if (localAction) {
        LocalProvider.action = undefined;
        localAction(items);
      }
      return items;
    }
    return LocalProvider.folders.map(
      (folder) => new LocalLibraryTreeItem(folder)
    );
  }
}

export class LocalLibraryTreeItem extends TreeItem {
  readonly tooltip = this.label;

  readonly iconPath = new ThemeIcon("file-directory");

  readonly contextValue = "LocalLibraryTreeItem";

  constructor(readonly label: string) {
    super(label, TreeItemCollapsibleState.Collapsed);
  }
}

export type LocalFileTreeItemData = {
  filename: string;
  ext: string;
  path: string;
  itemType: TreeItemId.local;
};

const fakeItem = {
  name: "",
  alia: [],
  id: 0,
  al: { id: 0, name: "", picUrl: "" },
  ar: [{ id: 0, name: "" }],
  dt: 4800000,
};

export class LocalFileTreeItem extends TreeItem implements PlayTreeItem {
  private static readonly _set = new Map<string, LocalFileTreeItem>();

  readonly iconPath = new ThemeIcon("file-media");

  readonly data = {
    filename: this.label,
    ext: this.description,
    path: this.tooltip,
    itemType: TreeItemId.local as TreeItemId.local,
  };

  readonly item = fakeItem;

  readonly contextValue = "LocalFileTreeItem";

  private constructor(
    readonly label: string,
    readonly description: string,
    readonly tooltip: string
  ) {
    super(label);
  }

  get valueOf(): string {
    return this.tooltip;
  }

  static new(
    label: string,
    description: string,
    tooltip: string
  ): LocalFileTreeItem {
    let element = this._set.get(tooltip);
    if (element) return element;
    element = new this(label, description, tooltip);
    this._set.set(tooltip, element);
    return element;
  }
}
