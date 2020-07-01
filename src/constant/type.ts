export type PlaylistItem = {
  description: string;
  id: number;
  name: string;
  playCount: string;
  subscribedCount: string;
  trackCount: number;
};

export type QueueItem = {
  name: string;
  id: number;
  alia: string;
  arName: string;
};

export type songsItem = {
  name: string;
  id: number;
  alia: string[];
  ar: {
    id: number;
    name: string;
  }[];
};

export type trackIdsItem = {
  id: number;
  v: number;
  at: number;
};

export interface Player {
  start(): Promise<void>;
  quit(): Promise<void>;
  load(url: string): Promise<void>;
  stop(): Promise<void>;
  togglePause(): Promise<void>;
  volume(volumeLevel: number): Promise<void>;
}
