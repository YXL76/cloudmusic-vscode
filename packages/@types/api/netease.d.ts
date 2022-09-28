export namespace NeteaseTypings {
  export type ArtistInitial =
    | "A"
    | "B"
    | "C"
    | "D"
    | "E"
    | "F"
    | "G"
    | "H"
    | "I"
    | "J"
    | "K"
    | "L"
    | "M"
    | "N"
    | "O"
    | "P"
    | "Q"
    | "R"
    | "S"
    | "T"
    | "U"
    | "V"
    | "W"
    | "X"
    | "Y"
    | "Z"
    | "";

  export type OS = "ios" | "pc" | "android";

  export type Cookie = {
    osver?: string;
    deviceId?: string;
    appver?: string;
    versioncode?: string;
    mobilename?: string;
    buildver?: string;
    resolution?: string;
    os?: OS;
    requestId?: string;
    channel?: string;
    /* eslint-disable @typescript-eslint/naming-convention */
    __csrf?: string;
    MUSIC_A?: string;
    MUSIC_U?: string;
    /* eslint-enable @typescript-eslint/naming-convention */
  };

  export type Profile = {
    userId: number;
    nickname: string;
    avatarUrl: string;
    backgroundUrl: string;
  };

  export type Account = {
    phone: string;
    username: string;
    password: string;
    captcha: string;
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
    al: { id: number; name: string; picUrl: string };
    mv: number | undefined;
  };

  export type SongsItemSt = SongsItem & { privilege: { st: number } };

  export type RecordData = SongsItem & { playCount: number };

  export type AnotherSongItem = {
    name: string;
    id: number;
    duration: number;
    alias: string[];
    artists: { id: number; name: string }[];
    album: { id: number; name: string; picUrl: string };
    privilege: { st: number };
    mvid: number;
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
    md5?: string;
    type?: string;
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

  export type LyricUser = {
    nickname: string;
    userid: number;
  };

  export type LyricData = {
    time: readonly number[];
    text: readonly [string, string, string][];
    user: [LyricUser?, LyricUser?];
  };

  export type CommentRet = {
    totalCount: number;
    hasMore: boolean;
    comments: CommentDetail[];
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
    dj: UserDetail;
    description: string;
    id: number;
    rid: number;
  };

  export type RawProgramDetail = {
    mainSong: AnotherSongItem;
    dj: UserDetail;
    radio: Omit<RadioDetail, "dj">;
    coverUrl: string;
    description: string;
    id: number;
  };

  export type MvDetail = {
    name: string;
    cover: string;
    // briefDesc: string;
    // desc: string | null;
    // playCount: number;
    // subCount: number;
    // shareCount: number;
    // commentCount: number;
    // duration: number;
    // publishTime: string;
    brs: { size: number; br: number; point: number }[];
    // commentThreadId: string;
  };
}
