import type {
  AlbumsItem,
  AnotherSongItem,
  Artist,
  CommentDetail,
  PlaylistItem,
  ProgramDetail,
  RadioDetail,
  RawCommentDetail,
  RawPlaylistItem,
  RawProgramDetail,
  SimplyUserDetail,
  SongsItem,
  UserDetail,
} from "../constant";

export const enum ArtistArea {
  all = "-1",
  zh = "7",
  ea = "96",
  ja = "8",
  kr = "16",
  other = "0",
}

export const enum ArtistType {
  male = "1",
  female = "2",
  band = "3",
}

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

export const enum CommentType {
  song = 0,
  mv = 1,
  playlist = 2,
  album = 3,
  dj = 4,
  video = 5,
  event = 6,
}

export const enum CommentAction {
  add = 1,
  delete = 0,
  reply = 2,
}

export const enum SortType {
  recommendation = 1,
  hottest = 2,
  latest = 3,
}

export const enum SearchType {
  single = 1,
  album = 10,
  artist = 100,
  playlist = 1000,
  user = 1002,
  mv = 1004,
  lyric = 1006,
  dj = 1009,
  video = 1014,
  complex = 1018,
}

export const enum TopSongType {
  all = 0,
  zh = 7,
  ea = 96,
  kr = 16,
  ja = 8,
}

export const anonymousToken =
  "8aae43f148f990410b9a2af38324af24e87ab9227c9265627ddd10145db744295fcd8701dc45b1ab8985e142f491516295dd965bae848761274a577a62b0fdc54a50284d1e434dcc04ca6d1a52333c9a";

export const resourceTypeMap = {
  0: "R_SO_4_",
  1: "R_MV_5_",
  2: "A_PL_0_",
  3: "R_AL_3_",
  4: "A_DJ_1_",
  5: "R_VI_62_",
  6: "A_EV_2_",
};

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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __csrf?: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  MUSIC_A?: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  MUSIC_U?: string;
};

export const cookieToJson = (cookie: string[]): Cookie => {
  if (!cookie) {
    return {} as Cookie;
  }
  const obj: Record<string, string> = {};
  cookie
    .map((x) => x.replace(/\s*Domain=[^(;|$)]+;*/, ""))
    .join(";")
    .split(";")
    .forEach((i) => {
      const arr = i.split("=");
      obj[arr[0]] = arr[1];
    });
  return obj as Cookie;
};

export const jsonToCookie = (json: Cookie): string => {
  return Object.entries(json)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`
    )
    .join("; ");
};

export const solveArtist = (item: Artist): Artist => {
  const { name, id, alias, briefDesc, albumSize, musicSize } = item;
  return { name, id, alias, briefDesc, albumSize, musicSize };
};

export const solveAlbumsItem = (item: AlbumsItem): AlbumsItem => {
  const { artists, alias, company, description, name, id } = item;
  return {
    artists: artists.map(solveArtist),
    alias,
    company,
    description,
    name,
    id,
  };
};

export const solveSongItem = (item: SongsItem): SongsItem => {
  const { name, id, dt, alia, ar, al } = item;
  return {
    name,
    id,
    dt,
    alia: alia ?? [""],
    ar: ar.map(({ id, name }) => ({ id, name })),
    al: { id: al.id, name: al.name, picUrl: al.picUrl },
  };
};

export const solveAnotherSongItem = (item: AnotherSongItem): SongsItem => {
  const { name, id, duration, alias, artists, album } = item;
  return {
    name,
    id,
    dt: duration,
    alia: alias,
    ar: artists.map(({ id, name }) => ({ id, name })),
    al: { id: album.id, name: album.name, picUrl: album.picUrl },
  };
};

export const solvePlaylistItem = (item: RawPlaylistItem): PlaylistItem => {
  const {
    bookCount,
    copywriter,
    creator,
    description,
    id,
    name,
    playCount,
    subscribedCount,
    trackCount,
    userId,
  } = item;
  return {
    description: copywriter || description || "",
    id,
    name,
    playCount,
    subscribedCount: bookCount || subscribedCount,
    trackCount,
    creator: creator || { userId: userId || 0 },
  };
};

export const solveUserDetail = (item: UserDetail): UserDetail => {
  const { userId, nickname, signature, followeds, follows, avatarUrl } = item;
  return {
    userId,
    nickname,
    signature,
    followeds: followeds || 0,
    follows: follows || 0,
    avatarUrl,
  };
};

export const solveSimplyUserDetail = (
  item: SimplyUserDetail
): SimplyUserDetail => {
  const { userId, nickname, avatarUrl } = item;
  return { userId, nickname, avatarUrl };
};

export const solveComment = (item: RawCommentDetail): CommentDetail => {
  const {
    user,
    commentId,
    content,
    time,
    likedCount,
    liked,
    beReplied,
    showFloorComment,
  } = item;
  return {
    user: solveSimplyUserDetail(user),
    commentId,
    content,
    time,
    likedCount,
    liked,
    replyCount: showFloorComment?.replyCount || 0,
    beReplied: beReplied
      ? {
          beRepliedCommentId: beReplied[0].beRepliedCommentId,
          content: beReplied[0].content,
          user: solveSimplyUserDetail(beReplied[0].user),
        }
      : undefined,
  };
};

export const solveRadioDetail = (item: RadioDetail): RadioDetail => {
  const { name, desc, id, subCount, programCount, playCount, dj } = item;
  return {
    name,
    desc,
    id,
    subCount,
    programCount,
    playCount,
    dj: solveUserDetail(dj),
  };
};

export const solveProgramDetail = (item: RawProgramDetail): ProgramDetail => {
  const { mainSong, dj, radio, coverUrl, description, id } = item;
  return {
    mainSong: {
      ...solveAnotherSongItem(mainSong),
      ar: [{ name: dj.nickname, id: 0 }],
      al: { name: radio.name, id: 0, picUrl: coverUrl },
    },
    dj: solveUserDetail(dj),
    description,
    id,
    rid: radio.id,
  };
};
