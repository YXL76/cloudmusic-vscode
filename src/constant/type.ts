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
  dt: number;
  alia: string;
  arName: string;
};

export type SongsItem = {
  name: string;
  id: number;
  dt: number;
  alia: string[];
  ar: {
    id: number;
    name: string;
  }[];
};

export type SongDetail = {
  id: number;
  url: string;
  md5: string;
};

export type TrackIdsItem = {
  id: number;
  v: number;
  at: number;
};

export interface Player {
  id: number;
  start(): Promise<void>;
  quit(): Promise<void>;
  load(element: QueueItemTreeItem): Promise<void>;
  togglePlay(): Promise<void>;
  volume(level: number): Promise<void>;
}
