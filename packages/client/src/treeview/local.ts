import { EventEmitter, ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import type { PlayTreeItem, PlayTreeItemData } from "./index.js";
import type { TreeDataProvider, TreeView } from "vscode";
import { readdir, stat } from "node:fs/promises";
import type { IAudioMetadata } from "music-metadata";
import { MUSIC_CACHE_DIR } from "../constant/index.js";
import type { NeteaseTypings } from "api";
import { parseFile } from "music-metadata";
import { resolve } from "node:path";

const supportedType: Set<string> = new Set(["WAVE", "FLAC", "MPEG"]);

type Content = LocalFileTreeItem | LocalLibraryTreeItem;

export class LocalProvider implements TreeDataProvider<Content> {
  private static readonly _folders: Set<string> = new Set();

  private static _instance: LocalProvider;

  private static readonly _files = new Map<LocalLibraryTreeItem, LocalFileTreeItem[]>();

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

  static async addFolder(path: string): Promise<string[] | undefined> {
    if (!this._folders.has(path)) {
      try {
        if ((await stat(path)).isDirectory()) {
          this._folders.add(path);
          this.refresh();
          return [...this._folders];
        }
      } catch {}
    }
    return;
  }

  static deleteFolder(path: string): string[] | undefined {
    if (this._folders.has(path)) {
      this._folders.delete(path);
      this.refresh();
      return [...this._folders];
    }
    return;
  }

  static refresh(): void {
    this._instance._onDidChangeTreeData.fire();
  }

  static async refreshLibrary(element: LocalLibraryTreeItem, hard?: boolean): Promise<readonly PlayTreeItemData[]> {
    if (hard) this._files.delete(element);
    const old = this._actions.get(element);
    old?.reject();
    return new Promise((resolve, reject) => {
      this._actions.set(element, { resolve, reject });
      this._instance._onDidChangeTreeData.fire(element);
      void this._instance.view.reveal(element, { expand: true });
    });
  }

  getTreeItem(element: LocalFileTreeItem | LocalLibraryTreeItem): LocalFileTreeItem | LocalLibraryTreeItem {
    return element;
  }

  async getChildren(element?: LocalLibraryTreeItem): Promise<(LocalFileTreeItem | LocalLibraryTreeItem)[]> {
    if (!element) return [MUSIC_CACHE_DIR, ...LocalProvider._folders].map((folder) => new LocalLibraryTreeItem(folder));

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
      while (folders.length) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const folder = folders.pop()!;
        const dirents = await readdir(folder, { withFileTypes: true });
        const paths: string[] = [];

        for (const dirent of dirents) {
          if (dirent.isFile()) paths.push(dirent.name);
          else if (dirent.isDirectory()) folders.push(resolve(folder, dirent.name));
        }

        const promises = paths.map(async (filename) => {
          const abspath = resolve(folder, filename);
          const meta = await parseFile(abspath, { duration: true, skipCovers: true });
          return { filename, abspath, meta };
        });

        (await Promise.allSettled(promises))
          .reduce<{ filename: string; abspath: string; meta: IAudioMetadata }[]>((acc, res) => {
            if (
              res.status === "fulfilled" &&
              res.value.meta.format.container &&
              supportedType.has(res.value.meta.format.container) &&
              !res.value.meta.format.codecProfile?.startsWith("AAC")
            ) {
              acc.push(res.value);
            }
            return acc;
          }, [])
          .forEach(({ filename, abspath, meta: { common, format } }) => {
            const item = {
              filename,
              abspath,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              container: format.container!,
              itemType: <const>"l",
              name: common.title || filename,
              alia: [],
              id: 0,
              al: { id: 0, name: common.album ?? "", picUrl: "" },
              ar: (common.artists ?? [common.artist ?? ""]).map((name) => ({ name, id: 0 })),
              dt: format.duration ? format.duration * 1000 : 480000,
              mv: undefined,
            };

            items.push(LocalFileTreeItem.new(item));
          });
      }
    } catch {}
    LocalProvider._files.set(element, items);

    action?.resolve(items.map(({ data }) => data));
    return items;
  }

  getParent(element: Content): undefined | LocalLibraryTreeItem {
    if (element instanceof LocalLibraryTreeItem) return;
    for (const [library, files] of LocalProvider._files) if (files.includes(element)) return library;
    throw Error(`{element.data.filename} not found`);
  }
}

export class LocalLibraryTreeItem extends TreeItem {
  declare readonly label: string;

  declare readonly tooltip: string;

  override readonly iconPath = new ThemeIcon("file-directory");

  override readonly contextValue = "LocalLibraryTreeItem";

  constructor(label: string) {
    super(label, TreeItemCollapsibleState.Collapsed);
    this.tooltip = label;
  }
}

export type LocalFileTreeItemData = NeteaseTypings.SongsItem & {
  filename: string;
  container: string;
  abspath: string;
  itemType: "l";
};

export class LocalFileTreeItem extends TreeItem implements PlayTreeItem {
  private static readonly _set = new Map<string, LocalFileTreeItem>();

  override readonly iconPath = new ThemeIcon("file-media");

  declare readonly label: string;

  override readonly description: string;

  override readonly tooltip: string;

  override readonly contextValue = "LocalFileTreeItem";

  private constructor(readonly data: LocalFileTreeItemData) {
    super(data.filename, TreeItemCollapsibleState.None);

    this.description = data.ar.map(({ name }) => name).join("/");
    this.tooltip = data.al.name;
  }

  override get valueOf(): string {
    return this.data.abspath;
  }

  static new(data: LocalFileTreeItemData): LocalFileTreeItem {
    let element = this._set.get(data.abspath);
    if (element) return element;
    element = new this(data);
    this._set.set(data.abspath, element);
    return element;
  }
}
