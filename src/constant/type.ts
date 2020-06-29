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
