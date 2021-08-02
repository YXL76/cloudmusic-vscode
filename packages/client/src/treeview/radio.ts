import {
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import type { PlayTreeItem, PlayTreeItemData } from ".";
import { AccountManager } from "../manager";
import { IPC } from "../utils";
import type { NeteaseTypings } from "api";
import type { TreeDataProvider } from "vscode";
import { UserTreeItem } from ".";
import i18n from "../i18n";

export class RadioProvider
  implements TreeDataProvider<UserTreeItem | RadioTreeItem | ProgramTreeItem>
{
  private static _instance: RadioProvider;

  private static readonly _actions = new Map<
    RadioTreeItem,
    { resolve: (value: PlayTreeItemData[]) => void; reject: () => void }
  >();

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
  }

  static async refreshRadio(
    element: RadioTreeItem
  ): Promise<readonly PlayTreeItemData[]> {
    const old = this._actions.get(element);
    old?.reject();
    return new Promise((resolve, reject) => {
      this._actions.set(element, { resolve, reject });
      this._instance._onDidChangeTreeData.fire(element);
    });
  }

  static refreshRadioHard(element: RadioTreeItem): void {
    IPC.deleteCache(`dj_program${element.valueOf}`);
    this._instance._onDidChangeTreeData.fire(element);
  }

  getTreeItem(
    element: UserTreeItem | RadioTreeItem | ProgramTreeItem
  ): UserTreeItem | RadioTreeItem | ProgramTreeItem {
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
      ProgramTreeItem.new({ ...program, pid })
    );
    const action = RadioProvider._actions.get(element);
    if (action) {
      RadioProvider._actions.delete(element);
      action.resolve(ret.map(({ data }) => data));
    }
    return ret;
  }
}

export class RadioTreeItem extends TreeItem {
  private static readonly _set = new Map<string, RadioTreeItem>();

  override readonly label!: string;

  override readonly tooltip = `${i18n.word.description}: ${this.item.desc || ""}
${i18n.word.trackCount}: ${this.item.programCount}
${i18n.word.playCount}: ${this.item.playCount}
${i18n.word.subscribedCount}: ${this.item.subCount}`;

  override readonly iconPath = new ThemeIcon("rss");

  override readonly contextValue = "RadioTreeItem";

  constructor(readonly item: NeteaseTypings.RadioDetail, readonly uid: number) {
    super(item.name, TreeItemCollapsibleState.Collapsed);
  }

  override get valueOf(): number {
    return this.item.id;
  }

  static new(item: NeteaseTypings.RadioDetail, uid: number): RadioTreeItem {
    const key = `${item.id}-${uid}`;
    let element = this._set.get(key);
    if (element) return element;
    element = new this(item, uid);
    this._set.set(key, element);
    return element;
  }

  static get(id: number, uid: number): RadioTreeItem | void {
    return this._set.get(`${id}-${uid}`);
  }
}

export type ProgramTreeItemData = NeteaseTypings.ProgramDetail & {
  uid?: number;
  pid: number;
  itemType: "p";
};

export class ProgramTreeItem extends TreeItem implements PlayTreeItem {
  private static readonly _set = new Map<string, ProgramTreeItem>();

  override readonly label!: string;

  override readonly description = this.data.mainSong.ar
    .map(({ name }) => name)
    .join("/");

  override readonly tooltip = this.data.dj.nickname;

  override readonly iconPath = new ThemeIcon("radio-tower");

  override readonly contextValue = "ProgramTreeItem";

  readonly item = this.data.mainSong;

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

  static new(data: Omit<ProgramTreeItemData, "itemType">): ProgramTreeItem {
    const key = `${data.id}-${data.pid}-${data.uid ?? 0}`;
    let element = this._set.get(key);
    if (element) return element;
    element = new this({ ...data, itemType: "p" });
    this._set.set(key, element);
    return element;
  }
}
