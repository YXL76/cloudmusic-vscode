export * from "./radio";
export * from "./local";
export * from "./playlist";
export * from "./queue";
export * from "./user";

import type {
  LocalFileTreeItem,
  LocalFileTreeItemData,
  ProgramTreeItem,
  ProgramTreeItemData,
  QueueItemTreeItem,
  QueueItemTreeItemData,
} from "./index";
import type { ThemeIcon, TreeItem } from "vscode";
import type { NeteaseTypings } from "api";

export type QueueContent =
  | QueueItemTreeItem
  | LocalFileTreeItem
  | ProgramTreeItem;

export type TreeItemId = "q" | "p" | "l";

export type PlayTreeItemData =
  | LocalFileTreeItemData
  | ProgramTreeItemData
  | QueueItemTreeItemData;

export interface PlayTreeItem extends TreeItem {
  readonly iconPath: ThemeIcon;
  readonly contextValue: string;
  readonly label: string;
  readonly description: string;
  readonly tooltip: string;
  readonly data: PlayTreeItemData;
  readonly item: NeteaseTypings.SongsItem;
  valueOf: number | string;
}
