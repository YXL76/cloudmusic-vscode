import type { NeteaseTypings } from "api";

export class AccountState {
  static uid = 0;

  static cookie: NeteaseTypings.Cookie = {};
}

export const cookieToJson = (cookie: string[]): NeteaseTypings.Cookie => {
  if (!cookie) return {} as NeteaseTypings.Cookie;

  const obj: Record<string, string> = {};
  cookie
    .map((x) => x.replace(/\s*Domain=[^(;|$)]+;*/, ""))
    .join(";")
    .split(";")
    .forEach((i) => {
      const [k, v] = i.split("=");
      obj[k] = v;
    });

  return obj as NeteaseTypings.Cookie;
};

export const jsonToCookie = (json: NeteaseTypings.Cookie): string => {
  return Object.entries(json)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`
    )
    .join("; ");
};

export const resolveArtist = ({
  name,
  id,
  alias,
  briefDesc,
  albumSize,
  musicSize,
}: NeteaseTypings.Artist): NeteaseTypings.Artist => ({
  name,
  id,
  alias,
  briefDesc,
  albumSize,
  musicSize,
});

export const resolveAlbumsItem = ({
  artists,
  alias,
  company,
  description,
  name,
  id,
}: NeteaseTypings.AlbumsItem): NeteaseTypings.AlbumsItem => ({
  artists: artists.map(resolveArtist),
  alias,
  company,
  description,
  name,
  id,
});

export const resolveSongItem = ({
  name,
  id,
  dt,
  alia,
  ar,
  al,
}: NeteaseTypings.SongsItem): NeteaseTypings.SongsItem => ({
  name,
  id,
  dt,
  alia: alia ?? [""],
  ar: ar.map(({ id, name }) => ({ id, name })),
  al: { id: al.id, name: al.name, picUrl: al.picUrl },
});

export const resolveSongItemSt = ({
  name,
  id,
  dt,
  alia,
  ar,
  al,
}: NeteaseTypings.SongsItemSt): NeteaseTypings.SongsItem => {
  // if (privilege && privilege?.st < 0) unplayable.add(id);
  return {
    name,
    id,
    dt,
    alia: alia ?? [""],
    ar: ar.map(({ id, name }) => ({ id, name })),
    al: { id: al.id, name: al.name, picUrl: al.picUrl },
  };
};

export const resolveAnotherSongItem = ({
  name,
  id,
  duration,
  alias,
  artists,
  album,
}: NeteaseTypings.AnotherSongItem): NeteaseTypings.SongsItem => {
  // if (privilege && privilege?.st < 0) unplayable.add(id);
  return {
    name,
    id,
    dt: duration,
    alia: alias,
    ar: artists.map(({ id, name }) => ({ id, name })),
    al: { id: album.id, name: album.name, picUrl: album.picUrl },
  };
};

export const resolvePlaylistItem = ({
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
}: NeteaseTypings.RawPlaylistItem): NeteaseTypings.PlaylistItem => ({
  description: copywriter || description || "",
  id,
  name,
  playCount,
  subscribedCount: bookCount || subscribedCount,
  trackCount,
  creator: creator || { userId: userId || 0 },
});

export const resolveUserDetail = ({
  userId,
  nickname,
  signature,
  followeds,
  follows,
  avatarUrl,
}: NeteaseTypings.UserDetail): NeteaseTypings.UserDetail => ({
  userId,
  nickname,
  signature,
  followeds: followeds || 0,
  follows: follows || 0,
  avatarUrl,
});

export const resolveSimplyUserDetail = ({
  userId,
  nickname,
  avatarUrl,
}: NeteaseTypings.SimplyUserDetail): NeteaseTypings.SimplyUserDetail => ({
  userId,
  nickname,
  avatarUrl,
});

export const resolveComment = ({
  user,
  commentId,
  content,
  time,
  likedCount,
  liked,
  beReplied,
  showFloorComment,
}: NeteaseTypings.RawCommentDetail): NeteaseTypings.CommentDetail => ({
  user: resolveSimplyUserDetail(user),
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
        user: resolveSimplyUserDetail(beReplied[0].user),
      }
    : undefined,
});

export const resolveRadioDetail = ({
  name,
  desc,
  id,
  subCount,
  programCount,
  playCount,
  dj,
}: NeteaseTypings.RadioDetail): NeteaseTypings.RadioDetail => ({
  name,
  desc,
  id,
  subCount,
  programCount,
  playCount,
  dj: resolveUserDetail(dj),
});

export const resolveProgramDetail = ({
  mainSong,
  dj,
  radio,
  coverUrl,
  description,
  id,
}: NeteaseTypings.RawProgramDetail): NeteaseTypings.ProgramDetail => ({
  mainSong: {
    ...resolveAnotherSongItem(mainSong),
    ar: [{ name: dj.nickname, id: 0 }],
    al: { name: radio.name, id: 0, picUrl: coverUrl },
  },
  dj: resolveUserDetail(dj),
  description,
  id,
  rid: radio.id,
});
