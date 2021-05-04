import {
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";
import type { PlayTreeItem, PlayTreeItemData, RefreshAction } from ".";
import type { ProgramDetail, RadioDetail } from "../constant";
import { AccountManager } from "../manager";
import type { TreeDataProvider } from "vscode";
import { TreeItemId } from "../constant";
import { apiCache } from "../util";
import { apiDjProgram } from "../api";
import i18n from "../i18n";

export class RadioProvider
  implements TreeDataProvider<RadioTreeItem | ProgramTreeItem> {
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
      else apiCache.del(`dj_program${element.valueOf}`);
    } else {
      this.radios.clear();
      apiCache.del("dj_sublist");
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
        await apiDjProgram(element.valueOf, element.item.programCount)
      ).map((program) => new ProgramTreeItem(program, pid));
      const localAction = RadioProvider.action;
      if (localAction) {
        RadioProvider.action = undefined;
        localAction(programs);
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

  constructor(public readonly item: RadioDetail) {
    super(item.name, TreeItemCollapsibleState.Collapsed);
  }

  get valueOf(): number {
    return this.item.id;
  }
}

export class ProgramTreeItem extends TreeItem implements PlayTreeItem {
  readonly label!: string;

  readonly tooltip = this.program.description;

  readonly item = this.program.mainSong;

  readonly description!: string;

  readonly iconPath = new ThemeIcon("radio-tower");

  readonly contextValue = "ProgramTreeItem";

  command = {
    title: "Detail",
    command: "cloudmusic.songDetail",
    arguments: [this],
  };

  constructor(
    public readonly program: ProgramDetail,
    public readonly pid: number
  ) {
    super(program.mainSong.name);
    this.description = this.item.ar.map(({ name }) => name).join("/");
  }

  get valueOf(): number {
    return this.item.id;
  }

  get data(): PlayTreeItemData {
    return {
      id: TreeItemId.program,
      ctr: [this.program, this.pid],
    };
  }
}
