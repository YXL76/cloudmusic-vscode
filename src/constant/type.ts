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
  index: number;
  delay: number;
  time: number[];
  text: string[];
};

export type LyricData = {
  time: number[];
  text: string[];
};

export type NativePlayer = {
  load(url: string): boolean;
  play(): boolean;
  pause(): void;
  stop(): void;
  volume(): number;
  setVolume(level: number): void;
  isPaused(): boolean;
  empty(): boolean;
  position(): number;
};

export interface Player {
  id: number;
  pid: number;
  dt: number;
  time: number;
  level: number;
  stop(): void;
  load(url: string, id: number, pid: number, dt: number): void;
  togglePlay(): void;
  volume(level: number): void;
}
