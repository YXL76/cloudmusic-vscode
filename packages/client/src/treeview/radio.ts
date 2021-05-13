import {
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import type { PlayTreeItem, RefreshAction } from ".";
import { AccountManager } from "../manager";
import { IPC } from "../utils";
import type { NeteaseTypings } from "api";
import type { TreeDataProvider } from "vscode";
import i18n from "../i18n";

export class RadioProvider
  implements TreeDataProvider<RadioTreeItem | ProgramTreeItem>
{
  static readonly radios = new Map<number, RadioTreeItem>();

  private static instance: RadioProvider;

  private static action?: RefreshAction;

  _onDidChangeTreeData = new EventEmitter<
    RadioTreeItem | ProgramTreeItem | void
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  static getInstance(): RadioProvider {
    return this.instance || (this.instance = new RadioProvider());
  }

  static refresh(element?: RadioTreeItem, action?: RefreshAction): void {
    if (element) {
      if (action) this.action = action;
      else IPC.deleteCache(`dj_program${element.valueOf}`);
    } else {
      this.radios.clear();
      IPC.deleteCache("dj_sublist");
    }
    this.instance._onDidChangeTreeData.fire(element);
  }

  getTreeItem(
    element: RadioTreeItem | ProgramTreeItem
  ): RadioTreeItem | ProgramTreeItem {
    return element;
  }

  async getChildren(
    element?: RadioTreeItem
  ): Promise<(RadioTreeItem | ProgramTreeItem)[]> {
    if (element) {
      const pid = element.valueOf;
      const programs = (
        await IPC.netease("djProgram", [
          element.valueOf,
          element.item.programCount,
        ])
      ).map((program) => ProgramTreeItem.new({ ...program, pid }));
      const localAction = RadioProvider.action;
      if (localAction) {
        RadioProvider.action = undefined;
        localAction(programs.map(({ data }) => data));
      }
      return programs;
    }
    const radios = await AccountManager.djradio();
    return radios.map((radio) => {
      const item = new RadioTreeItem(radio);
      RadioProvider.radios.set(radio.id, item);
      return item;
    });
  }
}

export class RadioTreeItem extends TreeItem {
  readonly label!: string;

  readonly tooltip = `${i18n.word.description}: ${this.item.desc || ""}
${i18n.word.trackCount}: ${this.item.programCount}
${i18n.word.playCount}: ${this.item.playCount}
${i18n.word.subscribedCount}: ${this.item.subCount}`;

  readonly iconPath = new ThemeIcon("rss");

  readonly contextValue = "RadioTreeItem";

  constructor(readonly item: NeteaseTypings.RadioDetail) {
    super(item.name, TreeItemCollapsibleState.Collapsed);
  }

  get valueOf(): number {
    return this.item.id;
  }
}

export type ProgramTreeItemData = NeteaseTypings.ProgramDetail & {
  pid: number;
  itemType: "p";
};

export class ProgramTreeItem extends TreeItem implements PlayTreeItem {
  private static readonly _set = new Map<number, ProgramTreeItem>();

  readonly label!: string;

  readonly description = this.data.mainSong.ar
    .map(({ name }) => name)
    .join("/");

  readonly tooltip = this.data.dj.nickname;

  readonly iconPath = new ThemeIcon("radio-tower");

  readonly contextValue = "ProgramTreeItem";

  readonly item = this.data.mainSong;

  command = {
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

  get valueOf(): number {
    return this.data.id;
  }

  static new(data: Omit<ProgramTreeItemData, "itemType">): ProgramTreeItem {
    let element = this._set.get(data.id);
    if (element) {
      if (element.data.pid === 0) element.data.pid = data.pid;
      return element;
    }
    element = new this({ ...data, itemType: "p" });
    this._set.set(data.id, element);
    return element;
  }
}
