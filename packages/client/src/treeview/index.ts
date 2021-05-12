export * from "./radio";
export * from "./local";
export * from "./playlist";
export * from "./queue";

import type {
  LocalFileTreeItem,
  LocalFileTreeItemData,
  ProgramTreeItem,
  ProgramTreeItemData,
  QueueItemTreeItem,
  QueueItemTreeItemData,
} from ".";
import type { ThemeIcon, TreeItem } from "vscode";
import type { NeteaseTypings } from "api";
import type { TreeItemId } from "../constant";

export type QueueContent =
  | QueueItemTreeItem
  | LocalFileTreeItem
  | ProgramTreeItem;

export type RefreshAction = (items: PlayTreeItemData[]) => void;

export type PlayTreeItemData =
  | ({ itemType: TreeItemId.local } & LocalFileTreeItemData)
  | ({ itemType: TreeItemId.program } & ProgramTreeItemData)
  | ({ itemType: TreeItemId.queue } & QueueItemTreeItemData);

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
