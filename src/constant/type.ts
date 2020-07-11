export type PlaylistItem = {
  description: string;
  id: number;
  name: string;
  playCount: string;
  subscribedCount: string;
  trackCount: number;
  userId: number;
};

export type Artist = {
  name: string;
  id: number;
  alias: string[];
  briefDesc: string;
  albumSize: number;
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
  al: {
    id: number;
    name: string;
  };
};

export type AlbumsItem = {
  artists: Artist[];
  alias: string[];
  company: string;
  description: string;
  subType: string;
  name: string;
  id: number;
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

export type LruCacheValue = {
  integrity: string;
  size: number;
};

export type Lyric = {
  delay: number;
  time: number[];
  text: string[];
};

export interface Player {
  id: number;
  pid: number;
  dt: number;
  time: number;
  start(): Promise<void>;
  quit(): Promise<void>;
  load(url: string, id: number, pid: number, dt: number): Promise<void>;
  togglePlay(): Promise<void>;
  volume(level: number): Promise<void>;
}
