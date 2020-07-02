import { QueueItemTreeItem } from "../provider/queueProvider";

export type PlaylistItem = {
  description: string;
  id: number;
  name: string;
  playCount: string;
  subscribedCount: string;
  trackCount: number;
  userId: number;
};

export type QueueItem = {
  name: string;
  id: number;
  bt: number;
  alia: string;
  arName: string;
};

export type SongsItem = {
  name: string;
  id: number;
  bt: number;
  alia: string[];
  ar: {
    id: number;
    name: string;
  }[];
};

export type TrackIdsItem = {
  id: number;
  v: number;
  at: number;
};

export interface Player {
  id: number;
  pid: number;
  start(): Promise<void>;
  quit(): Promise<void>;
  load(element: QueueItemTreeItem): Promise<void>;
  stop(): Promise<void>;
  togglePause(): Promise<void>;
  volume(volumeLevel: number): Promise<void>;
}
