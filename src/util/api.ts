import type {
  AlbumsItem,
  AnotherSongItem,
  Artist,
  CommentDetail,
  LyricData,
  PlaylistItem,
  RawCommentDetail,
  RawPlaylistItem,
  SimplyUserDetail,
  SongDetail,
  SongsItem,
  TrackIdsItem,
  UserDetail,
} from "../constant";
import type {
  ArtistArea,
  ArtistInitial,
  ArtistType,
  CommentType,
  RequestBaseConfig,
  SubAction,
  TopSongType,
} from "NeteaseCloudMusicApi";
import {
  CommentAction,
  DailySigninType,
  SearchSuggestType,
  SearchType,
  album,
  album_newest,
  album_sub,
  album_sublist,
  artist_album,
  artist_list,
  artist_songs,
  artist_sub,
  artist_sublist,
  artists,
  check_music,
  cloudsearch,
  comment,
  comment_floor,
  comment_like,
  comment_new,
  daily_signin,
  fm_trash,
  like,
  likelist,
  login_refresh,
  login_status,
  logout,
  lyric,
  personal_fm,
  personalized,
  personalized_newsong,
  playlist_catlist,
  playlist_create,
  playlist_delete,
  playlist_detail,
  playlist_highquality_tags,
  playlist_subscribe,
  playlist_subscribers,
  playlist_tracks,
  playlist_update,
  playmode_intelligence_list,
  recommend_resource,
  recommend_songs,
  related_playlist,
  scrobble,
  search_hot_detail,
  search_suggest,
  simi_artist,
  simi_playlist,
  simi_song,
  song_detail,
  song_url,
  top_album,
  top_artists,
  top_playlist,
  top_playlist_highquality,
  top_song,
  toplist,
  toplist_artist,
  user_detail,
  user_followeds,
  user_follows,
  user_level,
  user_playlist,
  user_record,
} from "NeteaseCloudMusicApi";
import { LyricCache, apiCache } from "../util";
import { MUSIC_QUALITY, PROXY, REAL_IP } from "../constant";
import { AccountManager } from "../manager";

function solveArtist(item: Artist): Artist {
  const { name, id, alias, briefDesc, albumSize, musicSize } = item;
  return { name, id, alias, briefDesc, albumSize, musicSize };
}

function solveAlbumsItem(item: AlbumsItem): AlbumsItem {
  const { artists, alias, company, description, name, id } = item;
  return {
    artists: artists.map((artist: Artist) => solveArtist(artist)),
    alias,
    company,
    description,
    name,
    id,
  };
}

function solveSongItem(item: SongsItem): SongsItem {
  const { name, id, dt, alia, ar, al } = item;
  return { name, id, dt: dt / 1000, alia: alia ?? [""], ar, al };
}

function solveAnotherSongItem(item: AnotherSongItem): SongsItem {
  const { name, id, duration, alias, artists, album } = item;
  return {
    name,
    id,
    dt: duration / 1000,
    alia: alias,
    ar: artists.map(({ id, name }) => ({ id, name })),
    al: album,
  };
}

function solvePlaylistItem(item: RawPlaylistItem): PlaylistItem {
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
}

function solveUserDetail(item: UserDetail): UserDetail {
  const { userId, nickname, signature, followeds, follows, avatarUrl } = item;
  return {
    userId,
    nickname,
    signature,
    followeds: followeds || 0,
    follows: follows || 0,
    avatarUrl,
  };
}

function solveSimplyUserDetail(item: SimplyUserDetail): SimplyUserDetail {
  const { userId, nickname, avatarUrl } = item;
  return { userId, nickname, avatarUrl };
}

function solveComment(item: RawCommentDetail): CommentDetail {
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
}

export const baseQuery: RequestBaseConfig = {
  cookie: {},
  proxy: PROXY,
  realIP: REAL_IP,
};

export async function apiAlbum(
  id: number
): Promise<{ info: AlbumsItem; songs: SongsItem[] }> {
  const key = `album${id}`;
  const value = apiCache.get(key);
  if (value) {
    return value as { info: AlbumsItem; songs: SongsItem[] };
  }
  try {
    const { status, body } = await album(Object.assign({ id }, baseQuery));

    if (status !== 200) {
      return { info: {} as AlbumsItem, songs: [] };
    }
    const { songs } = body;
    const info = solveAlbumsItem(body.album as AlbumsItem);
    const ret = {
      info,
      songs: (songs as SongsItem[]).map((song) => solveSongItem(song)),
    };
    apiCache.set(key, ret);
    return ret;
  } catch {
    return { info: {} as AlbumsItem, songs: [] };
  }
}

export async function apiAlbumNewest(): Promise<AlbumsItem[]> {
  const key = "album_newest";
  const value = apiCache.get(key);
  if (value) {
    return value as AlbumsItem[];
  }
  try {
    const { status, body } = await album_newest(Object.assign(baseQuery));
    if (status !== 200) {
      return [];
    }
    const { albums } = body;
    const ret = (albums as AlbumsItem[]).map((album) => solveAlbumsItem(album));
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiArtists(
  id: number
): Promise<{ info: Artist; songs: SongsItem[] }> {
  const key = `artists${id}`;
  const value = apiCache.get(key);
  if (value) {
    return value as { info: Artist; songs: SongsItem[] };
  }

  try {
    const { status, body } = await artists(Object.assign({ id }, baseQuery));
    if (status !== 200) {
      return { info: {} as Artist, songs: [] };
    }
    const { artist, hotSongs } = body;
    const ret = {
      info: solveArtist(artist as Artist),
      songs: (hotSongs as SongsItem[]).map((song) => solveSongItem(song)),
    };
    apiCache.set(key, ret);
    return ret;
  } catch {
    return { info: {} as Artist, songs: [] };
  }
}

export async function apiAlbumSub(id: number, t: SubAction): Promise<boolean> {
  try {
    const { status } = await album_sub(Object.assign({ id, t }, baseQuery));
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {}
  return false;
}

export async function apiAlbumSublist(): Promise<AlbumsItem[]> {
  const limit = 100;
  let offset = 0;
  let ret: AlbumsItem[] = [];
  try {
    for (let i = 0; i < 16; ++i) {
      const { body, status } = await album_sublist(
        Object.assign({ limit, offset }, baseQuery)
      );
      if (status !== 200) {
        break;
      }
      const { data } = body;
      ret = ret.concat(
        (data as AlbumsItem[]).map((item) => solveAlbumsItem(item))
      );
      if ((data as AlbumsItem[]).length < limit) {
        break;
      }
      offset += limit;
    }
  } catch {}
  return ret;
}

export async function apiArtistAlbum(id: number): Promise<AlbumsItem[]> {
  const key = `artist_album${id}`;
  const value = apiCache.get(key);
  if (value) {
    return value as AlbumsItem[];
  }
  let ret: AlbumsItem[] = [];
  const limit = 50;
  let offset = 0;
  try {
    for (let i = 0; i < 16; ++i) {
      const { status, body } = await artist_album(
        Object.assign({ id, limit, offset }, baseQuery)
      );
      if (status !== 200) {
        break;
      }
      const { hotAlbums, more } = body;
      ret = ret.concat(
        (hotAlbums as AlbumsItem[]).map((hotAlbum) => solveAlbumsItem(hotAlbum))
      );
      if (more) {
        offset += limit;
      } else {
        break;
      }
    }
  } catch {}
  if (ret.length > 0) {
    apiCache.set(key, ret);
  }
  return ret;
}

export async function apiArtistList(
  type: ArtistType,
  area: ArtistArea,
  initial: ArtistInitial,
  limit: number,
  offset: number
): Promise<Artist[]> {
  const key = `artist_album${type}-${area}-${
    initial as string
  }-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as Artist[];
  }
  try {
    const { status, body } = await artist_list(
      Object.assign({ type, area, initial, limit, offset }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { artists } = body;
    const ret = (artists as Artist[]).map((artist) => solveArtist(artist));
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiArtistSongs(
  id: number,
  limit: number,
  offset: number
): Promise<SongsItem[]> {
  const key = `artist_songs${id}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as SongsItem[];
  }
  try {
    const { status, body } = await artist_songs(
      Object.assign({ id, limit, offset }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { songs } = body;
    const ret = (songs as SongsItem[]).map((song) => solveSongItem(song));
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiArtistSub(id: number, t: SubAction): Promise<boolean> {
  try {
    const { status } = await artist_sub(Object.assign({ id, t }, baseQuery));
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {}
  return false;
}

export async function apiArtistSublist(): Promise<Artist[]> {
  const limit = 100;
  let offset = 0;
  let ret: Artist[] = [];
  try {
    for (let i = 0; i < 16; ++i) {
      const { body, status } = await artist_sublist(
        Object.assign({ limit, offset }, baseQuery)
      );
      if (status !== 200) {
        break;
      }
      const { data } = body;
      ret = ret.concat((data as Artist[]).map((item) => solveArtist(item)));
      if ((data as Artist[]).length < limit) {
        break;
      }
      offset += limit;
    }
  } catch {}
  return ret;
}

export async function apiCheckMusic(id: number, br: number): Promise<boolean> {
  try {
    const { status, body } = await check_music(
      Object.assign({ id, br }, baseQuery)
    );
    if (status !== 200) {
      return false;
    }
    const { success } = body;
    return success as boolean;
  } catch {
    return false;
  }
}

export async function apiCommentAdd(
  type: CommentType,
  id: number,
  content: string
): Promise<boolean> {
  try {
    const { status } = await comment(
      Object.assign(
        { type, id, content, t: CommentAction.add as const },
        baseQuery
      )
    );
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {}
  return false;
}

export async function apiCommentReply(
  type: CommentType,
  id: number,
  content: string,
  commentId: number
): Promise<boolean> {
  try {
    const { status } = await comment(
      Object.assign(
        { type, id, content, commentId, t: CommentAction.reply as const },
        baseQuery
      )
    );
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {}
  return false;
}

export async function apiCommentFloor(
  type: CommentType,
  id: number,
  parentCommentId: number,
  limit: number,
  time: number
): Promise<{ hasMore: boolean; comments: CommentDetail[] }> {
  const key = `comment_floor${type}-${id}-${parentCommentId}-${limit}-${time}`;
  const value = apiCache.get(key);
  if (value) {
    return value as {
      hasMore: boolean;
      comments: CommentDetail[];
    };
  }
  try {
    const { status, body } = await comment_floor(
      Object.assign({ type, id, parentCommentId, limit, time }, baseQuery)
    );
    if (status !== 200) {
      return { hasMore: false, comments: [] };
    }
    const { data } = body;
    const { totalCount, hasMore, comments } = data as {
      totalCount: number;
      hasMore: boolean;
      comments: RawCommentDetail[];
    };
    const ret = {
      total: totalCount,
      hasMore,
      comments: comments.map((comment) => solveComment(comment)),
    };
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return { hasMore: false, comments: [] };
}

export async function apiCommentLike(
  type: CommentType,
  t: SubAction,
  id: number,
  cid: number
): Promise<boolean> {
  try {
    const { status } = await comment_like(
      Object.assign({ type, t, id, cid }, baseQuery)
    );
    if (status === 200) {
      return true;
    }
  } catch {}
  return false;
}

export async function apiCommentNew(
  type: CommentType,
  id: number,
  pageNo: number,
  pageSize: number,
  sortType: number
): Promise<{ total: number; hasMore: boolean; comments: CommentDetail[] }> {
  const key = `comment_new${type}-${id}-${pageNo}-${pageSize}-${sortType}`;
  const value = apiCache.get(key);
  if (value) {
    return value as {
      total: number;
      hasMore: boolean;
      comments: CommentDetail[];
    };
  }
  try {
    const { status, body } = await comment_new(
      Object.assign({ type, id, pageNo, pageSize, sortType }, baseQuery)
    );
    if (status !== 200) {
      return { total: 0, hasMore: false, comments: [] };
    }
    const { data } = body;
    const { totalCount, hasMore, comments } = data as {
      totalCount: number;
      hasMore: boolean;
      comments: RawCommentDetail[];
    };
    const ret = {
      total: totalCount,
      hasMore,
      comments: comments.map((comment) => solveComment(comment)),
    };
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return { total: 0, hasMore: false, comments: [] };
}

export async function apiDailySignin(): Promise<boolean> {
  const tasks: Promise<boolean>[] = [];
  tasks.push(
    new Promise((resolve) => {
      void daily_signin(Object.assign(baseQuery)).then(({ status }) => {
        resolve(status === 200 ? true : false);
      });
    })
  );
  tasks.push(
    new Promise((resolve) => {
      void daily_signin(
        Object.assign({ type: DailySigninType.pc }, baseQuery)
      ).then(({ status }) => {
        resolve(status === 200 ? true : false);
      });
    })
  );
  try {
    if ((await Promise.all(tasks)).includes(true)) {
      return true;
    }
  } catch {}
  return false;
}

export async function apiFmTrash(id: number): Promise<boolean> {
  try {
    const { status } = await fm_trash(Object.assign({ id }, baseQuery));
    if (status === 200) {
      return true;
    }
  } catch {}
  return false;
}

export async function apiLike(
  id: number,
  islike?: "true" | "false"
): Promise<boolean> {
  try {
    const { status } = await like(
      Object.assign({ id, like: islike }, baseQuery)
    );
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function apiLikelist(): Promise<number[]> {
  try {
    const { status, body } = await likelist(
      Object.assign({ uid: AccountManager.uid }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { ids } = body;
    return ids as number[];
  } catch {
    return [];
  }
}

export async function apiLoginRefresh(): Promise<boolean> {
  try {
    const { status } = await login_refresh(baseQuery);
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function apiLoginStatus(): Promise<boolean> {
  try {
    const { status } = await login_status(baseQuery);
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function apiLogout(): Promise<boolean> {
  try {
    const { status } = await logout(baseQuery);
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function apiLyric(id: number): Promise<LyricData> {
  const lyricCache = await LyricCache.get(`${id}`);
  if (lyricCache) {
    return lyricCache;
  }
  const time: number[] = [0];
  const text: string[] = ["Lyric"];
  try {
    const { status, body } = await lyric(Object.assign({ id }, baseQuery));
    if (status !== 200) {
      return { time, text };
    }
    const lrc = (body.lrc as { lyric: "string" }).lyric;
    const lines = lrc.split("\n");
    let prev = 0;
    for (const line of lines) {
      const r = /^\[(\d{2,}):(\d{2})(?:[\.\:](\d{2,3}))?](.*)$/g.exec(
        line.trim()
      );
      if (r) {
        const minute = parseInt(r[1]);
        const second = parseInt(r[2]);
        const millisecond = parseInt(r[3]) * (r[3].length === 2 ? 10 : 1);
        const txt = r[4];
        const current = minute * 60 + second + millisecond / 1000;
        if (current >= prev) {
          prev = current;
          time.push(current);
          text.push(txt || "Lyric");
        }
      }
    }

    LyricCache.put(`${id}`, { time, text });
  } catch {}
  return { time, text };
}

export async function apiPersonalFm(): Promise<SongsItem[]> {
  try {
    const { status, body } = await personal_fm(baseQuery);
    if (status !== 200) {
      return [];
    }
    const { data } = body;
    return (data as AnotherSongItem[]).map((song) =>
      solveAnotherSongItem(song)
    );
  } catch {
    return [];
  }
}

export async function apiPersonalized(): Promise<PlaylistItem[]> {
  const key = "personalized";
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
  try {
    const { body, status } = await personalized(baseQuery);
    if (status !== 200) {
      return [];
    }
    const { result } = body;
    const ret = (result as RawPlaylistItem[]).map((playlist) =>
      solvePlaylistItem(playlist)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiPersonalizedNewsong(): Promise<SongsItem[]> {
  const key = "personalized_newsong";
  const value = apiCache.get(key);
  if (value) {
    return value as SongsItem[];
  }
  try {
    const { body, status } = await personalized_newsong(baseQuery);
    if (status !== 200) {
      return [];
    }
    const { result } = body;
    const ret = (result as { song: AnotherSongItem }[]).map(({ song }) =>
      solveAnotherSongItem(song)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

type PlaylistCatlistItem = { name: string; category?: number; hot: boolean };

type PlaylistCatlist = Record<string, PlaylistCatlistItem[]>;

export async function apiPlaylistCatlist(): Promise<PlaylistCatlist> {
  const key = "playlist_catlist";
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistCatlist;
  }
  try {
    const { body, status } = await playlist_catlist(baseQuery);
    if (status !== 200) {
      return {};
    }
    const ret: PlaylistCatlist = {};
    const { sub, categories } = body;
    for (const [key, value] of Object.entries(
      categories as {
        [key: string]: string;
      }
    )) {
      ret[value] = (sub as PlaylistCatlistItem[])
        .filter((value) => value.category && `${value.category}` === key)
        .map(({ name, hot }) => ({ name, hot }));
    }
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return {};
}

export async function apiPlaylistCreate(
  name: string,
  privacy: 0 | 10
): Promise<boolean> {
  try {
    const { status } = await playlist_create(
      Object.assign({ name, privacy }, baseQuery)
    );
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {}
  return false;
}

export async function apiPlaylistDelete(id: number): Promise<boolean> {
  try {
    const { status } = await playlist_delete(Object.assign({ id }, baseQuery));
    if (status === 200) {
      return true;
    }
  } catch {}
  return false;
}

export async function apiPlaylistDetail(id: number): Promise<SongsItem[]> {
  const key = `playlist_detail${id}`;
  const value = apiCache.get(key);
  if (value) {
    return value as SongsItem[];
  }
  try {
    const { status, body } = await playlist_detail(
      Object.assign({ id }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { playlist, privileges } = body;
    const { tracks, trackIds } = playlist as {
      tracks: SongsItem[];
      trackIds: TrackIdsItem[];
    };
    if (tracks.length === trackIds.length) {
      const ret: SongsItem[] = [];
      for (let i = 0; i < (privileges as { st: number }[]).length; ++i) {
        if ((privileges as { st: number }[])[i].st >= 0) {
          ret.push(solveSongItem(tracks[i]));
        }
      }
      apiCache.set(key, ret);
      return ret;
    }
    const ret = await apiSongDetail(trackIds.map((trackId) => trackId.id));
    apiCache.set(key, ret);
    return ret;
  } catch {
    return [];
  }
}

export async function apiHighqualityTags(): Promise<PlaylistCatlistItem[]> {
  const key = "playlist_highquality_tags";
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistCatlistItem[];
  }
  try {
    const { status, body } = await playlist_highquality_tags(baseQuery);
    if (status !== 200) {
      return [];
    }
    const { tags } = body;
    const ret = (tags as {
      name: string;
      hot: boolean;
    }[]).map(({ name, hot }) => ({ name, hot }));
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiPlaylistSubscribe(
  id: number,
  t: SubAction
): Promise<boolean> {
  try {
    const { status } = await playlist_subscribe(
      Object.assign({ id, t }, baseQuery)
    );
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {}
  return false;
}

export async function apiPlaylistSubscribers(
  id: number,
  limit: number,
  offset: number
): Promise<UserDetail[]> {
  const key = `playlist_subscribers${id}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as UserDetail[];
  }
  try {
    const { body, status } = await playlist_subscribers(
      Object.assign({ id, limit, offset }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { subscribers } = body;
    const ret = (subscribers as UserDetail[]).map((subscriber) =>
      solveUserDetail(subscriber)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiPlaylistTracks(
  op: "add" | "del",
  pid: number,
  tracks: number[]
): Promise<boolean> {
  try {
    const { status } = await playlist_tracks(
      Object.assign({ op, pid, tracks: tracks.join(",") }, baseQuery)
    );
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {}
  return false;
}

export async function apiPlaylistUpdate(
  id: number,
  name: string,
  desc: string
): Promise<boolean> {
  try {
    const { status } = await playlist_update(
      Object.assign({ id, name, desc }, baseQuery)
    );
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {}
  return false;
}

export async function apiPlaymodeIntelligenceList(
  id: number,
  pid: number
): Promise<SongsItem[]> {
  let ret: SongsItem[] = [];
  try {
    const { body, status } = await playmode_intelligence_list(
      Object.assign({ id, pid }, baseQuery)
    );
    if (status !== 200) {
      return ret;
    }
    const { data } = body;
    ret = (data as { songInfo: SongsItem }[]).map(({ songInfo }) =>
      solveSongItem(songInfo)
    );
  } catch {}
  return ret;
}

export async function apiRecommendResource(): Promise<PlaylistItem[]> {
  const key = "recommend_resource";
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
  try {
    const { body, status } = await recommend_resource(baseQuery);
    if (status !== 200) {
      return [];
    }
    const { recommend } = body;
    const ret = (recommend as RawPlaylistItem[]).map((playlist) =>
      solvePlaylistItem(playlist)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiRecommendSongs(): Promise<SongsItem[]> {
  const key = "recommend_songs";
  const value = apiCache.get(key);
  if (value) {
    return value as SongsItem[];
  }
  try {
    const { body, status } = await recommend_songs(baseQuery);
    if (status !== 200) {
      return [];
    }
    const { data } = body;
    const ret = (data as { dailySongs: SongsItem[] }).dailySongs.map((song) =>
      solveSongItem(song)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiRelatedPlaylist(id: number): Promise<PlaylistItem[]> {
  const key = `related_playlist${id}`;
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
  try {
    const { body, status } = await related_playlist(
      Object.assign({ id }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { playlists } = body;
    const ret = (playlists as RawPlaylistItem[]).map((playlist) =>
      solvePlaylistItem(playlist)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiScrobble(
  id: number,
  sourceid: number,
  time: number
): Promise<void> {
  await scrobble(Object.assign({ id, sourceid, time }, baseQuery));
}

export async function apiSearchSingle(
  keywords: string,
  limit: number,
  offset: number
): Promise<SongsItem[]> {
  const key = `search${SearchType.single}-${keywords}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as SongsItem[];
  }
  try {
    const { body, status } = await cloudsearch(
      Object.assign(
        { keywords, type: SearchType.single, limit, offset },
        baseQuery
      )
    );
    if (status !== 200) {
      return [];
    }
    const { result } = body;
    const ret = (result as { songs: SongsItem[] }).songs.map((song) =>
      solveSongItem(song)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiSearchAlbum(
  keywords: string,
  limit: number,
  offset: number
): Promise<AlbumsItem[]> {
  const key = `search${SearchType.album}-${keywords}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as AlbumsItem[];
  }
  try {
    const { body, status } = await cloudsearch(
      Object.assign(
        { keywords, type: SearchType.album, limit, offset },
        baseQuery
      )
    );
    if (status !== 200) {
      return [];
    }
    const { result } = body;
    const ret = (result as { albums: AlbumsItem[] }).albums.map((album) =>
      solveAlbumsItem(album)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiSearchArtist(
  keywords: string,
  limit: number,
  offset: number
): Promise<Artist[]> {
  const key = `search${SearchType.artist}-${keywords}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as Artist[];
  }
  try {
    const { body, status } = await cloudsearch(
      Object.assign(
        { keywords, type: SearchType.artist, limit, offset },
        baseQuery
      )
    );
    if (status !== 200) {
      return [];
    }
    const { result } = body;
    const ret = (result as { artists: Artist[] }).artists.map((artist) =>
      solveArtist({ ...artist, briefDesc: "" })
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiSearchPlaylist(
  keywords: string,
  limit: number,
  offset: number
): Promise<PlaylistItem[]> {
  const key = `search${SearchType.playlist}-${keywords}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
  try {
    const { body, status } = await cloudsearch(
      Object.assign(
        { keywords, type: SearchType.playlist, limit, offset },
        baseQuery
      )
    );
    if (status !== 200) {
      return [];
    }
    const { result } = body;
    const ret = (result as {
      playlists: RawPlaylistItem[];
    }).playlists.map((playlist) => solvePlaylistItem(playlist));
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiSearchHotDetail(): Promise<
  { searchWord: string; content: string }[]
> {
  const key = "search_hot_detail";
  const value = apiCache.get(key);
  if (value) {
    return value as { searchWord: string; content: string }[];
  }
  try {
    const { body, status } = await search_hot_detail(baseQuery);
    if (status !== 200) {
      return [];
    }
    const { data } = body;
    const ret = (data as { searchWord: string; content: string }[]).map(
      ({ searchWord, content }) => ({
        searchWord,
        content,
      })
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiSearchSuggest(keywords: string): Promise<string[]> {
  const key = `search_suggest${keywords}`;
  const value = apiCache.get(key);
  if (value) {
    return value as string[];
  }
  try {
    const { body, status } = await search_suggest(
      Object.assign({ keywords, type: SearchSuggestType.mobile }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { result } = body;
    const ret = (result as { allMatch: { keyword: string }[] }).allMatch.map(
      ({ keyword }) => keyword
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiSimiArtist(id: number): Promise<Artist[]> {
  const key = `simi_artist${id}`;
  const value = apiCache.get(key);
  if (value) {
    return value as Artist[];
  }
  try {
    const { body, status } = await simi_artist(
      Object.assign({ id }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { artists } = body;
    const ret = (artists as Artist[]).map((artist) => solveArtist(artist));
    apiCache.set(key, ret);
    return ret;
  } catch {
    return [];
  }
}

export async function apiSimiPlaylist(
  id: number,
  limit: number,
  offset: number
): Promise<PlaylistItem[]> {
  const key = `simi_playlist${id}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
  try {
    const { body, status } = await simi_playlist(
      Object.assign({ id, limit, offset }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { playlists } = body;
    const ret = (playlists as RawPlaylistItem[]).map((playlist) =>
      solvePlaylistItem(playlist)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {
    return [];
  }
}

export async function apiSimiSong(
  id: number,
  limit: number,
  offset: number
): Promise<SongsItem[]> {
  const key = `simi_song${id}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as SongsItem[];
  }
  try {
    const { body, status } = await simi_song(
      Object.assign({ id, limit, offset }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { songs } = body;
    const ret = (songs as AnotherSongItem[]).map((song) =>
      solveAnotherSongItem(song)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {
    return [];
  }
}

export async function apiSongDetail(trackIds: number[]): Promise<SongsItem[]> {
  const key = `song_detail${trackIds[0]}`;
  if (trackIds.length === 1) {
    const value = apiCache.get(key);
    if (value) {
      return value as SongsItem[];
    }
  }
  const limit = 1000;
  const tasks: Promise<SongsItem[]>[] = [];
  for (let i = 0; i < trackIds.length; i += limit) {
    tasks.push(
      new Promise((resolve, reject) => {
        void song_detail(
          Object.assign({ ids: trackIds.slice(i, i + limit) }, baseQuery)
        ).then(({ status, body }) => {
          if (status !== 200) {
            reject();
          }
          const { songs, privileges } = body;
          const ret: SongsItem[] = [];
          for (let i = 0; i < (privileges as { st: number }[]).length; ++i) {
            if ((privileges as { st: number }[])[i].st >= 0) {
              ret.push(solveSongItem((songs as SongsItem[])[i]));
            }
          }
          resolve(ret);
        });
      })
    );
  }
  try {
    const ret = (await Promise.all(tasks)).flat();
    if (trackIds.length === 1) {
      apiCache.set(key, ret);
    }
    return ret;
  } catch {}
  return [];
}

export async function apiSongUrl(trackIds: number[]): Promise<SongDetail[]> {
  const limit = 1000;
  const tasks: Promise<SongDetail[]>[] = [];
  for (let i = 0; i < trackIds.length; i += limit) {
    tasks.push(
      new Promise((resolve, reject) => {
        void song_url(
          Object.assign(
            { id: trackIds.slice(i, i + limit).join(","), br: MUSIC_QUALITY },
            baseQuery
          )
        ).then(({ status, body }) => {
          if (status !== 200) {
            reject();
          }
          const { data } = body;
          resolve(data as SongDetail[]);
        });
      })
    );
  }
  try {
    return (await Promise.all(tasks))
      .flat()
      .reduce((result: SongDetail[], song: SongDetail) => {
        const { id, url, md5 } = song;
        result[trackIds.indexOf(song.id)] = { id, url, md5 };
        return result;
      }, []);
  } catch {}
  return [];
}

export async function apiTopAlbum(): Promise<AlbumsItem[]> {
  const key = "top_album";
  const value = apiCache.get(key);
  if (value) {
    return value as AlbumsItem[];
  }
  try {
    const { status, body } = await top_album(baseQuery);
    if (status !== 200) {
      return [];
    }
    const { monthData } = body;
    const ret = (monthData as AlbumsItem[]).map((item) =>
      solveAlbumsItem(item)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiTopArtists(
  limit: number,
  offset: number
): Promise<Artist[]> {
  const key = `top_artists${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as Artist[];
  }
  try {
    const { status, body } = await top_artists(
      Object.assign({ limit, offset }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { artists } = body;
    const ret = (artists as Artist[]).map((artist) => solveArtist(artist));
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiTopPlaylist(
  cat: string,
  limit: number,
  offset: number
): Promise<PlaylistItem[]> {
  const key = `top_playlist${cat}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
  try {
    const { status, body } = await top_playlist(
      Object.assign({ cat, limit, offset }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { playlists } = body;
    const ret = (playlists as PlaylistItem[]).map((playlist) =>
      solvePlaylistItem(playlist)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiTopPlaylistHighquality(
  cat: string,
  limit: number,
  offset: number
): Promise<PlaylistItem[]> {
  const key = `top_playlist_highquality${cat}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
  try {
    const { status, body } = await top_playlist_highquality(
      Object.assign({ cat, limit, offset }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { playlists } = body;
    const ret = (playlists as PlaylistItem[]).map((playlist) =>
      solvePlaylistItem(playlist)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiTopSong(type: TopSongType): Promise<SongsItem[]> {
  const key = `top_song${type}`;
  const value = apiCache.get(key);
  if (value) {
    return value as SongsItem[];
  }
  try {
    const { status, body } = await top_song(Object.assign({ type }, baseQuery));
    if (status !== 200) {
      return [];
    }
    const { data } = body;
    const ret = (data as AnotherSongItem[]).map((item) =>
      solveAnotherSongItem(item)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiToplist(): Promise<PlaylistItem[]> {
  const key = "toplist";
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
  try {
    const { status, body } = await toplist(baseQuery);
    if (status !== 200) {
      return [];
    }
    const { list } = body;
    const ret = (list as RawPlaylistItem[]).map((item) =>
      solvePlaylistItem(item)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiToplistArtist(): Promise<Artist[]> {
  const key = "toplist_artist";
  const value = apiCache.get(key);
  if (value) {
    return value as Artist[];
  }
  try {
    const { status, body } = await toplist_artist(baseQuery);
    if (status !== 200) {
      return [];
    }
    const { list } = body;
    const ret = (list as { artists: Artist[] }).artists.map((artist) =>
      solveArtist(artist)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiUserDetail(
  uid: number
): Promise<UserDetail | undefined> {
  const key = `user_detail${uid}`;
  const value = apiCache.get(key);
  if (value) {
    return value as UserDetail;
  }
  try {
    const { status, body } = await user_detail(
      Object.assign({ uid }, baseQuery)
    );
    if (status !== 200) {
      return undefined;
    }
    const { profile } = body;
    const ret = solveUserDetail(profile as UserDetail);
    return ret;
  } catch {}
  return undefined;
}

export async function apiUserFolloweds(
  uid: number,
  limit: number
): Promise<UserDetail[]> {
  const key = `user_followeds${uid}-${limit}`;
  const value = apiCache.get(key);
  if (value) {
    return value as UserDetail[];
  }
  try {
    const { status, body } = await user_followeds(
      Object.assign({ uid, limit }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { followeds } = body;
    const ret = (followeds as UserDetail[]).map((followed) =>
      solveUserDetail(followed)
    );
    return ret;
  } catch {}
  return [];
}

export async function apiUserFollows(
  uid: number,
  limit: number,
  offset: number
): Promise<UserDetail[]> {
  const key = `user_follows${uid}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as UserDetail[];
  }
  try {
    const { status, body } = await user_follows(
      Object.assign({ uid, limit, offset }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { follow } = body;
    const ret = (follow as UserDetail[]).map((item) => solveUserDetail(item));
    return ret;
  } catch {}
  return [];
}

type UserLevel = {
  progress: number;
  level: number;
};

export async function apiUserLevel(): Promise<UserLevel> {
  const key = "user_level";
  const value = apiCache.get(key);
  if (value) {
    return value as UserLevel;
  }
  try {
    const { status, body } = await user_level(baseQuery);
    if (status !== 200) {
      return {} as UserLevel;
    }
    const { data } = body;
    const { progress, level } = data as UserLevel;
    const ret = { progress, level };
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return {} as UserLevel;
}

export async function apiUserPlaylist(uid: number): Promise<PlaylistItem[]> {
  const key = `user_playlist${uid}`;
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
  try {
    const { status, body } = await user_playlist(
      Object.assign({ uid }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { playlist } = body;
    const ret = (playlist as RawPlaylistItem[]).map((playlist) =>
      solvePlaylistItem(playlist)
    );
    if (ret.length > 0) {
      apiCache.set(key, ret);
    }
    return ret;
  } catch {}
  return [];
}

export async function apiUserRecord(
  refresh?: true
): Promise<(SongsItem & { playCount: number })[][]> {
  const key = "user_record";
  let value: (SongsItem & { playCount: number })[][] | undefined;
  if (!refresh && (value = apiCache.get(key))) {
    return value;
  }
  const tasks: Promise<(SongsItem & { playCount: number })[]>[] = [];
  tasks.push(
    new Promise((resolve, reject) => {
      void user_record(
        Object.assign({ type: 1 as const, uid: AccountManager.uid }, baseQuery)
      ).then(({ status, body }) => {
        if (status !== 200) {
          reject();
        }
        resolve(
          (body.weekData as { playCount: number; song: SongsItem }[]).map(
            ({ playCount, song }) => ({
              ...solveSongItem(song),
              playCount,
            })
          )
        );
      });
    })
  );
  tasks.push(
    new Promise((resolve, reject) => {
      void user_record(
        Object.assign({ type: 0 as const, uid: AccountManager.uid }, baseQuery)
      ).then(({ status, body }) => {
        if (status !== 200) {
          reject();
        }
        resolve(
          (body.allData as { playCount: number; song: SongsItem }[]).map(
            ({ playCount, song }) => ({
              ...solveSongItem(song),
              playCount,
            })
          )
        );
      });
    })
  );
  try {
    const ret = await Promise.all(tasks);
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}
