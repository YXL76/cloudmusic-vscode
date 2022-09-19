export * from "./radio.js";
export * from "./local.js";
export * from "./playlist.js";
export * from "./queue.js";
export * from "./user.js";

import type {
  LocalFileTreeItem,
  LocalFileTreeItemData,
  ProgramTreeItem,
  ProgramTreeItemData,
  QueueItemTreeItem,
  QueueItemTreeItemData,
} from "./index.js";
import type { ThemeIcon, TreeItem } from "vscode";

export type QueueContent = QueueItemTreeItem | LocalFileTreeItem | ProgramTreeItem;

export type TreeItemId = "q" | "p" | "l";

export type PlayTreeItemData = LocalFileTreeItemData | ProgramTreeItemData | QueueItemTreeItemData;

export interface PlayTreeItem extends TreeItem {
  readonly iconPath: ThemeIcon;
  readonly contextValue: string;
  readonly label: string;
  readonly description: string;
  readonly tooltip: string;
  readonly data: PlayTreeItemData;
  valueOf: number | string;
}
