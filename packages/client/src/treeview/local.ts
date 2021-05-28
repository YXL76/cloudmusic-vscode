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
import { fromFile } from "file-type";
import { resolve } from "path";

export class LocalProvider
  implements TreeDataProvider<LocalFileTreeItem | LocalLibraryTreeItem>
{
  static readonly folders: string[] = [];

  static readonly files = new Map<string, readonly LocalFileTreeItem[]>();

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
    if (!element)
      return LocalProvider.folders.map(
        (folder) => new LocalLibraryTreeItem(folder)
      );

    const localAction = LocalProvider.action;
    LocalProvider.action = undefined;

    let items: LocalFileTreeItem[] = [];
    const { label } = element;
    if (LocalProvider.files.has(label))
      items = LocalProvider.files.get(label) as LocalFileTreeItem[];
    else {
      let index = 0;
      const folders: string[] = [label];
      try {
        while (index < folders.length) {
          const folder = folders[index];
          const files = await workspace.fs.readDirectory(Uri.file(folder));
          const paths: string[] = [];

          for (const [name, type] of files) {
            if (type === FileType.File) paths.push(name);
            else if (type === FileType.Directory)
              folders.push(resolve(folder, name));
          }

          const treeitems = (
            await Promise.all(
              paths.map(async (filename) => {
                const id = resolve(folder, filename);
                return {
                  filename,
                  id,
                  ...(await fromFile(id)),
                };
              })
            )
          )
            .filter(
              ({ mime }) =>
                mime && (mime === "audio/x-flac" || mime === "audio/mpeg")
            )
            .map((item) => LocalFileTreeItem.new(item));
          items.push(...treeitems);

          ++index;
        }
      } catch {}
      LocalProvider.files.set(label, items);
    }

    localAction?.(items.map(({ data }) => data));
    return items;
  }
}

export class LocalLibraryTreeItem extends TreeItem {
  override readonly tooltip = this.label;

  override readonly iconPath = new ThemeIcon("file-directory");

  override readonly contextValue = "LocalLibraryTreeItem";

  constructor(override readonly label: string) {
    super(label, TreeItemCollapsibleState.Collapsed);
  }
}

export type LocalFileTreeItemData = {
  filename: string;
  ext?: string;
  id: string; // path
  itemType: "l";
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

  override readonly iconPath = new ThemeIcon("file-media");

  override readonly label = this.data.filename;

  override readonly description = this.data.ext ?? "";

  override readonly tooltip = this.data.id;

  readonly item = fakeItem;

  override readonly contextValue = "LocalFileTreeItem";

  private constructor(readonly data: LocalFileTreeItemData) {
    super(data.filename, TreeItemCollapsibleState.None);
  }

  override get valueOf(): string {
    return this.tooltip;
  }

  static new(data: Omit<LocalFileTreeItemData, "itemType">): LocalFileTreeItem {
    let element = this._set.get(data.id);
    if (element) return element;
    element = new this({ ...data, itemType: "l" });
    this._set.set(data.id, element);
    return element;
  }
}
