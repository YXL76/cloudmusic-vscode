import { CookieJar } from "tough-cookie";
import { IPCControl } from "@cloudmusic/shared";
import type { IPCServerMsg } from "@cloudmusic/shared";
import { IPC_SRV } from "../../server.js";
import type { NeteaseTypings } from "api";
import type { Socket } from "node:net";

class AccountState {
  cookies = new Map<number, CookieJar>();

  profile = new Map<number, NeteaseTypings.Profile>();

  get defaultCookie(): CookieJar {
    if (this.cookies.size) {
      const [[, cookie]] = this.cookies;
      return cookie;
    }
    return new CookieJar();
  }

  setStaticCookie(cookie: CookieJar) {
    for (const url of [
      "http://music.163.com/weapi/v1/artist/songs/",
      "http://music.163.com/weapi/v1/comment/",
      "http://music.163.com/eapi/v2/resource/comments/",
      "http://music.163.com/weapi/playlist/create/",
      "http://music.163.com/weapi/playlist/remove/",
      "http://music.163.com/weapi/batch/",
      "http://music.163.com/weapi/personalized/newsong",
      "http://music.163.com/weapi/playlist/manipulate/tracks",
    ]) {
      cookie.setCookieSync("os=pc", url);
      cookie.setCookieSync("appver=2.9.7", url);
    }
    for (const url of [
      "http://music.163.com/weapi/resource/comments/add/",
      "http://music.163.com/weapi/resource/comments/reply/",
    ]) {
      cookie.setCookieSync("os=android", url);
    }
  }
}

export const ACCOUNT_STATE = new AccountState();

export function broadcastProfiles(socket?: Socket): void {
  const msg: IPCServerMsg = {
    t: IPCControl.netease,
    cookies: [...ACCOUNT_STATE.cookies].map(([uid, c]) => ({
      uid,
      cookie: JSON.stringify(c.serializeSync()),
    })),
    profiles: [...ACCOUNT_STATE.profile.values()],
  };
  socket ? IPC_SRV.send(socket, msg) : IPC_SRV.broadcast(msg);
}

export const jsonToCookie = (json: NeteaseTypings.Cookie): string => {
  return Object.entries(json)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("; ");
};

const http2Https = (url?: string): string => {
  if (!url) return "";
  if (url.startsWith("http://")) url = `https://${url.substring(7)}`;
  return `${url}?param=384y384`;
};

export const resolveArtist = ({
  name,
  id,
  alias,
  briefDesc,
  albumSize,
  musicSize,
}: NeteaseTypings.Artist): NeteaseTypings.Artist => ({ name, id, alias, briefDesc, albumSize, musicSize });

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
  mv,
}: NeteaseTypings.SongsItem | NeteaseTypings.SongsItemSt): NeteaseTypings.SongsItem => ({
  name,
  id,
  dt,
  alia: alia ?? [""],
  ar: ar.map(({ id, name }) => ({ id, name })),
  al: { id: al.id, name: al.name, picUrl: http2Https(al.picUrl) },
  mv: mv ? mv : undefined,
});

export const resolveAnotherSongItem = ({
  name,
  id,
  duration,
  alias,
  artists,
  album,
  mvid,
}: NeteaseTypings.AnotherSongItem): NeteaseTypings.SongsItem => ({
  name,
  id,
  dt: duration,
  alia: alias,
  ar: artists.map(({ id, name }) => ({ id, name })),
  al: { id: album.id, name: album.name, picUrl: http2Https(album.picUrl) },
  mv: mvid ? mvid : undefined,
});

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
}: NeteaseTypings.SimplyUserDetail): NeteaseTypings.SimplyUserDetail => ({ userId, nickname, avatarUrl });

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
    al: { name: radio.name, id: 0, picUrl: http2Https(coverUrl) },
  },
  dj: resolveUserDetail(dj),
  description,
  id,
  rid: radio.id,
});

export const resolveMvDetail = ({ name, cover, brs }: NeteaseTypings.MvDetail): NeteaseTypings.MvDetail => ({
  name,
  cover: http2Https(cover),
  brs,
});
