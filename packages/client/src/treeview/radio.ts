import {
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import type { PlayTreeItem, PlayTreeItemData } from "./index";
import type { TreeDataProvider, TreeView } from "vscode";
import { AccountManager } from "../manager";
import { IPC } from "../utils";
import type { NeteaseTypings } from "api";
import { UserTreeItem } from "./index";
import i18n from "../i18n";

type Content = UserTreeItem | RadioTreeItem | ProgramTreeItem;

export class RadioProvider implements TreeDataProvider<Content> {
  private static _instance: RadioProvider;

  private static readonly _actions = new WeakMap<
    RadioTreeItem,
    { resolve: (value: PlayTreeItemData[]) => void; reject: () => void }
  >();

  readonly view!: TreeView<Content>;

  _onDidChangeTreeData = new EventEmitter<
    UserTreeItem | RadioTreeItem | ProgramTreeItem | void
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  static getInstance(): RadioProvider {
    return this._instance || (this._instance = new RadioProvider());
  }

  static refresh(): void {
    this._instance._onDidChangeTreeData.fire();
  }

  static refreshUser(element: UserTreeItem): void {
    IPC.deleteCache(`dj_sublist${element.uid}`);
    this._instance._onDidChangeTreeData.fire(element);
    void this._instance.view.reveal(element, { expand: true });
  }

  static async refreshRadio(
    element: RadioTreeItem
  ): Promise<readonly PlayTreeItemData[]> {
    const old = this._actions.get(element);
    old?.reject();
    return new Promise((resolve, reject) => {
      this._actions.set(element, { resolve, reject });
      this._instance._onDidChangeTreeData.fire(element);
      void this._instance.view.reveal(element, { expand: true });
    });
  }

  static refreshRadioHard(element: RadioTreeItem): void {
    IPC.deleteCache(`dj_program${element.valueOf}`);
    this._instance._onDidChangeTreeData.fire(element);
    void this._instance.view.reveal(element, { expand: true });
  }

  getTreeItem(element: Content): Content {
    return element;
  }

  async getChildren(
    element?: UserTreeItem | RadioTreeItem
  ): Promise<UserTreeItem[] | RadioTreeItem[] | ProgramTreeItem[]> {
    if (!element) {
      const accounts = [];
      for (const [, { userId, nickname }] of AccountManager.accounts)
        accounts.push(UserTreeItem.new(nickname, userId));
      return accounts;
    }
    if (element instanceof UserTreeItem) {
      const { uid } = element;
      return (await AccountManager.djradio(uid)).map((radio) =>
        RadioTreeItem.new(radio, uid)
      );
    }
    const {
      uid,
      item: { id: pid, programCount },
    } = element;
    const programs = await IPC.netease("djProgram", [uid, pid, programCount]);
    const ret = programs.map((program) =>
      ProgramTreeItem.new({ ...program, pid, itemType: "p" })
    );
    const action = RadioProvider._actions.get(element);
    if (action) {
      RadioProvider._actions.delete(element);
      action.resolve(ret.map(({ data }) => data));
    }
    return ret;
  }

  getParent(element: Content): undefined | UserTreeItem | RadioTreeItem {
    if (element instanceof UserTreeItem) return;
    if (element instanceof RadioTreeItem)
      return UserTreeItem.unsafeGet(element.uid);
    return RadioTreeItem.unsafeGet(element.data.pid);
  }
}

export class RadioTreeItem extends TreeItem {
  private static readonly _set = new Map<number, RadioTreeItem>();

  override readonly label!: string;

  override readonly tooltip = `${i18n.word.description}: ${this.item.desc || ""}
${i18n.word.trackCount}: ${this.item.programCount}
${i18n.word.playCount}: ${this.item.playCount}
${i18n.word.subscribedCount}: ${this.item.subCount}`;

  override readonly iconPath = new ThemeIcon("rss");

  override readonly contextValue = "RadioTreeItem";

  constructor(readonly item: NeteaseTypings.RadioDetail, public uid: number) {
    super(item.name, TreeItemCollapsibleState.Collapsed);
  }

  override get valueOf(): number {
    return this.item.id;
  }

  static new(item: NeteaseTypings.RadioDetail, uid = 0): RadioTreeItem {
    let element = this._set.get(item.id);
    if (element) {
      element.uid = uid;
      return element;
    }
    element = new this(item, uid);
    this._set.set(item.id, element);
    return element;
  }

  static unsafeGet(pid: number): RadioTreeItem {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._set.get(pid)!;
  }
}

export type ProgramTreeItemData = NeteaseTypings.ProgramDetail & {
  pid: number;
  itemType: "p";
};

export class ProgramTreeItem extends TreeItem implements PlayTreeItem {
  private static readonly _set = new Map<number, ProgramTreeItem>();

  override readonly label!: string;

  override readonly description = this.data.mainSong.ar
    .map(({ name }) => name)
    .join("/");

  override readonly tooltip = this.data.dj.nickname;

  override readonly iconPath = new ThemeIcon("radio-tower");

  override readonly contextValue = "ProgramTreeItem";

  override command = {
    title: "Detail",
    command: "cloudmusic.songDetail",
    arguments: [this],
  };

  private constructor(readonly data: ProgramTreeItemData) {
    super(
      `${data.mainSong.name}${
        data.mainSong.alia[0] ? ` (${data.mainSong.alia.join("/")})` : ""
      }`
    );
  }

  override get valueOf(): number {
    return this.data.id;
  }

  static new(data: ProgramTreeItemData): ProgramTreeItem {
    let element = this._set.get(data.id);
    if (element) {
      if (data.pid) element.data.pid = data.pid;
      return element;
    }
    element = new this(data);
    this._set.set(data.id, element);
    return element;
  }
}
