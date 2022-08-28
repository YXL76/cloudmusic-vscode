import {
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import type { PlayTreeItem, PlayTreeItemData } from "./index";
import type { TreeDataProvider, TreeView } from "vscode";
import { MUSIC_CACHE_DIR } from "../constant";
import type { MimeType } from "file-type";
import { fileTypeFromFile } from "file-type";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const supportedType: MimeType[] = [
  "audio/vnd.wave",
  "audio/x-flac",
  "audio/mpeg",
];

type Content = LocalFileTreeItem | LocalLibraryTreeItem;

export class LocalProvider implements TreeDataProvider<Content> {
  static readonly folders: string[] = [];

  private static _instance: LocalProvider;

  private static readonly _files = new Map<
    LocalLibraryTreeItem,
    LocalFileTreeItem[]
  >();

  private static _actions = new WeakMap<
    LocalLibraryTreeItem,
    { resolve: (value: PlayTreeItemData[]) => void; reject: () => void }
  >();

  readonly view!: TreeView<Content>;

  _onDidChangeTreeData = new EventEmitter<LocalLibraryTreeItem | void>();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  static getInstance(): LocalProvider {
    return this._instance || (this._instance = new LocalProvider());
  }

  static refresh(): void {
    this._instance._onDidChangeTreeData.fire();
  }

  static async refreshLibrary(
    element: LocalLibraryTreeItem,
    hard?: boolean
  ): Promise<readonly PlayTreeItemData[]> {
    if (hard) this._files.delete(element);
    const old = this._actions.get(element);
    old?.reject();
    return new Promise((resolve, reject) => {
      this._actions.set(element, { resolve, reject });
      this._instance._onDidChangeTreeData.fire(element);
      void this._instance.view.reveal(element, { expand: true });
    });
  }

  getTreeItem(
    element: LocalFileTreeItem | LocalLibraryTreeItem
  ): LocalFileTreeItem | LocalLibraryTreeItem {
    return element;
  }

  async getChildren(
    element?: LocalLibraryTreeItem
  ): Promise<(LocalFileTreeItem | LocalLibraryTreeItem)[]> {
    if (!element) {
      return [MUSIC_CACHE_DIR, ...LocalProvider.folders].map(
        (folder) => new LocalLibraryTreeItem(folder)
      );
    }

    const action = LocalProvider._actions.get(element);
    LocalProvider._actions.delete(element);

    let items: LocalFileTreeItem[] = [];
    if (LocalProvider._files.has(element)) {
      items = LocalProvider._files.get(element) ?? [];
      action?.resolve(items.map(({ data }) => data));
      return items;
    }

    const folders: string[] = [element.label];
    try {
      for (let idx = 0; idx < folders.length; ++idx) {
        const folder = folders[idx];
        const dirents = await readdir(folder, { withFileTypes: true });
        const paths: string[] = [];

        for (const dirent of dirents) {
          if (dirent.isFile()) paths.push(dirent.name);
          else if (dirent.isDirectory())
            folders.push(resolve(folder, dirent.name));
        }

        (
          await Promise.all(
            paths.map(async (filename) => {
              const id = resolve(folder, filename);
              const mime = await fileTypeFromFile(id);
              return { filename, id, ...mime };
            })
          )
        )
          .filter(({ mime }) => mime && supportedType.includes(mime))
          .forEach((item) => items.push(LocalFileTreeItem.new(item)));
      }
    } catch {}
    LocalProvider._files.set(element, items);

    action?.resolve(items.map(({ data }) => data));
    return items;
  }

  getParent(element: Content): undefined | LocalLibraryTreeItem {
    if (element instanceof LocalLibraryTreeItem) return;
    for (const [library, files] of LocalProvider._files) {
      if (files.includes(element)) return library;
    }
    throw Error(`{element.data.filename} not found`);
  }
}

export class LocalLibraryTreeItem extends TreeItem {
  override readonly label!: string;

  override readonly tooltip = this.label;

  override readonly iconPath = new ThemeIcon("file-directory");

  override readonly contextValue = "LocalLibraryTreeItem";

  constructor(label: string) {
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
