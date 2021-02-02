export type Account = {
  phone: string;
  username: string;
  password: string;
  countrycode: string;
};

export type PlaylistItem = {
  description: string | null;
  id: number;
  name: string;
  playCount: number;
  subscribedCount: number;
  trackCount: number;
  creator: UserDetail;
};

export interface RawPlaylistItem extends PlaylistItem {
  bookCount?: number;
  copywriter?: string;
  userId?: number;
}

export type Artist = {
  name: string;
  id: number;
  alias: string[];
  briefDesc: string;
  albumSize: number;
  musicSize: number;
};

export type SongsItem = {
  name: string;
  id: number;
  dt: number;
  alia: string[];
  ar: { id: number; name: string }[];
  al: { id: number; name: string };
};

export type RecordData = SongsItem & { playCount: number };

export type AnotherSongItem = {
  name: string;
  id: number;
  duration: number;
  alias: string[];
  artists: { id: number; name: string }[];
  album: { id: number; name: string };
};

export type AlbumsItem = {
  artists: Artist[];
  alias: string[];
  company: string;
  description: string;
  name: string;
  id: number;
};

export type SongDetail = {
  // id: number;
  url: string;
  md5: string;
  type: string;
};

export type UnlockSongItem = {
  album: string;
  artist: string[];
  dt: number;
  id: string;
  name: string;
};

export type UserDetail = {
  userId: number;
  nickname: string;
  signature: string;
  followeds: number;
  follows: number;
  avatarUrl: string;
};

export type SimplyUserDetail = {
  userId: number;
  nickname: string;
  avatarUrl: string;
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

export type RawCommentDetail = {
  user: SimplyUserDetail;
  commentId: number;
  content: string;
  time: number;
  likedCount: number;
  liked: boolean;
  beReplied?: {
    beRepliedCommentId: number;
    content: string;
    user: SimplyUserDetail;
  }[];
  showFloorComment?: {
    replyCount: number;
  };
};

export type CommentDetail = {
  user: SimplyUserDetail;
  commentId: number;
  content: string;
  time: number;
  likedCount: number;
  liked: boolean;
  replyCount: number;
  beReplied?: {
    beRepliedCommentId: number;
    content: string;
    user: SimplyUserDetail;
  };
};

export type RadioDetail = {
  name: string;
  desc: string;
  id: number;
  subCount: number;
  programCount: number;
  playCount: number;
  dj: UserDetail;
};

export type ProgramDetail = {
  mainSong: SongsItem;
  description: string;
  id: number;
};

export type RawProgramDetail = {
  mainSong: AnotherSongItem;
  dj: UserDetail;
  radio: Omit<RadioDetail, "dj">;
  description: string;
  id: number;
};

export type NativePlayer = {};

export interface NativeModule {
  // startKeyboardEvent(callback: (res: number) => void, prev: number): void;

  kuwoCrypt(msg: string): Buffer;

  playerEmpty(Player: NativePlayer): boolean;
  playerLoad(Player: NativePlayer, url: string): boolean;
  playerNew(): NativePlayer;
  playerPause(Player: NativePlayer): void;
  playerPlay(Player: NativePlayer): boolean;
  playerPosition(Player: NativePlayer): number;
  playerSetVolume(Player: NativePlayer, level: number): void;
  playerStop(Player: NativePlayer): void;
}
