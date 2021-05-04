export * from "./radio";
export * from "./local";
export * from "./playlist";
export * from "./queue";

import type { LocalFileTreeItem, ProgramTreeItem, QueueItemTreeItem } from ".";
import type { ThemeIcon, TreeItem } from "vscode";
import type { TreeItemId } from "../constant";

export type QueueContent =
  | QueueItemTreeItem
  | LocalFileTreeItem
  | ProgramTreeItem;

export type RefreshAction = (items: QueueContent[]) => void;

export type PlayTreeItemData =
  | {
      id: TreeItemId.local;
      ctr: Parameters<typeof LocalFileTreeItem.new>[0];
    }
  | {
      id: TreeItemId.program;
      ctr: Parameters<typeof ProgramTreeItem.new>[0];
    }
  | {
      id: TreeItemId.queue;
      ctr: Parameters<typeof QueueItemTreeItem.new>[0];
    };

export interface PlayTreeItem extends TreeItem {
  readonly iconPath: ThemeIcon;
  readonly contextValue: string;
  readonly label: string;
  readonly description: string;
  readonly tooltip: string;
  valueOf: number | string;
  data: PlayTreeItemData;
}
