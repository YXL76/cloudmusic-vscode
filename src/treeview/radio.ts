import {
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import type { ProgramDetail, RadioDetail } from "../constant";
import { AccountManager } from "../manager";
import type { TreeDataProvider } from "vscode";
import { apiCache } from "../util";
import { apiDjProgram } from "../api";
import { i18n } from "../i18n";

export class RadioProvider
  implements TreeDataProvider<RadioTreeItem | ProgramTreeItem> {
  private static instance: RadioProvider;

  private static action?: (items: ProgramTreeItem[]) => void;

  _onDidChangeTreeData = new EventEmitter<
    RadioTreeItem | ProgramTreeItem | void
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  static getInstance() {
    return this.instance || (this.instance = new RadioProvider());
  }

  static refresh(
    element?: RadioTreeItem,
    action?: (items: ProgramTreeItem[]) => void
  ) {
    if (element) {
      if (action) {
        apiCache.del(`dj_program${element.item.id}`);
        this.action = action;
      }
    } else apiCache.del("dj_sublist");
    this.instance._onDidChangeTreeData.fire(element);
  }

  getTreeItem(element: RadioTreeItem | ProgramTreeItem) {
    return element;
  }

  async getChildren(element?: RadioTreeItem) {
    if (element) {
      const programs = (
        await apiDjProgram(element.item.id, element.item.programCount)
      ).map((program) => new ProgramTreeItem(program));
      const localAction = RadioProvider.action;
      if (localAction) {
        RadioProvider.action = undefined;
        localAction(programs);
      }
      return programs;
    }
    const radios = await AccountManager.djradio();
    return radios.map((radio) => new RadioTreeItem(radio));
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

  constructor(public readonly item: RadioDetail) {
    super(item.name, TreeItemCollapsibleState.Collapsed);
  }

  valueOf() {
    return this.item.id;
  }
}

export class ProgramTreeItem extends TreeItem {
  readonly label!: string;

  readonly description = (() =>
    this.item.mainSong.ar.map(({ name }) => name).join("/"))();

  readonly iconPath = new ThemeIcon("radio-tower");

  readonly contextValue = "ProgramTreeItem";

  // command = {
  //   title: "Detail",
  //   command: "cloudmusic.songDetail",
  //   arguments: [this],
  // };

  constructor(public readonly item: ProgramDetail) {
    super(item.mainSong.name);
  }

  valueOf() {
    return this.item.mainSong.id;
  }
}
