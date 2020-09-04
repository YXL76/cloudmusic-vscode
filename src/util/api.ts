import {
  AlbumsItem,
  AnotherSongItem,
  Artist,
  LyricData,
  MUSIC_QUALITY,
  PROXY,
  PlaylistItem,
  REAL_IP,
  RawPlaylistItem,
  SongDetail,
  SongsItem,
  TrackIdsItem,
  UserDetail,
} from "../constant";
import { LyricCache, apiCache } from "../util";
import {
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
  user_playlist,
  user_record,
} from "NeteaseCloudMusicApi";
import { AccountManager } from "../manager";

const solveArtist = (item: Artist): Artist => {
  const { name, id, alias, briefDesc, albumSize, musicSize } = item;
  return { name, id, alias, briefDesc, albumSize, musicSize };
};

const solveAlbumsItem = (item: AlbumsItem): AlbumsItem => {
  const { artists, alias, company, description, name, id } = item;
  return {
    artists: artists.map((artist: Artist) => solveArtist(artist)),
    alias,
    company,
    description,
    name,
    id,
  };
};

const solveSongItem = (item: SongsItem): SongsItem => {
  const { name, id, dt, alia, ar, al } = item;
  return { name, id, dt: dt / 1000, alia, ar, al };
};

const solveAnotherSongItem = (item: AnotherSongItem): SongsItem => {
  const { name, id, duration, alias, artists, album } = item;
  return {
    name,
    id,
    dt: duration / 1000,
    alia: alias,
    ar: artists.map(({ id, name }) => ({ id, name })),
    al: { id: album.id, name: album.name },
  };
};

const solvePlaylistItem = (item: RawPlaylistItem): PlaylistItem => {
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

const solveUserDetail = (item: UserDetail): UserDetail => {
  const { userId, nickname, signature, followeds, follows } = item;
  return {
    userId,
    nickname,
    signature,
    followeds: followeds || 0,
    follows: follows || 0,
  };
};

export const baseQuery = {
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
    const info = solveAlbumsItem(body.album);
    const ret = {
      info,
      songs: songs.map((song: SongsItem) => solveSongItem(song)),
    };
    apiCache.set(key, ret);
    return ret;
  } catch {
    return { info: {} as AlbumsItem, songs: [] };
  }
}

export async function apiAlbumNewest(): Promise<AlbumsItem[]> {
  const key = `album_newest`;
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
    const ret = albums.map((album: AlbumsItem) => solveAlbumsItem(album));
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
      info: solveArtist(artist),
      songs: hotSongs.map((song: SongsItem) => solveSongItem(song)),
    };
    apiCache.set(key, ret);
    return ret;
  } catch {
    return { info: {} as Artist, songs: [] };
  }
}

export async function apiAlbumSub(id: number, t?: 1): Promise<boolean> {
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
    while (true) {
      const { body, status } = await album_sublist(
        Object.assign({ limit, offset }, baseQuery)
      );
      if (status !== 200) {
        break;
      }
      const { data } = body;
      ret = ret.concat(data.map((item: AlbumsItem) => solveAlbumsItem(item)));
      if (data.length < limit) {
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
    while (true) {
      const { status, body } = await artist_album(
        Object.assign({ id, limit, offset }, baseQuery)
      );
      if (status !== 200) {
        break;
      }
      const { hotAlbums, more } = body;
      ret = ret.concat(
        hotAlbums.map((hotAlbum: AlbumsItem) => solveAlbumsItem(hotAlbum))
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

export enum ArtistType {
  male = 1,
  female = 2,
  band = 3,
}

export enum ArtistArea {
  all = -1,
  zh = 7,
  en = 96,
  ja = 8,
  kr = 16,
  other = 0,
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
  | undefined;

export async function apiArtistList(
  type: ArtistType,
  area: ArtistArea,
  initial: ArtistInitial,
  limit: number,
  offset: number
): Promise<Artist[]> {
  const key = `artist_album${type}-${area}-${initial}-${limit}-${offset}`;
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
    const ret = artists.map((artist: Artist) => solveArtist(artist));
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
    const ret = songs.map((song: SongsItem) => solveSongItem(song));
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiArtistSub(id: number, t?: 1): Promise<boolean> {
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
    while (true) {
      const { body, status } = await artist_sublist(
        Object.assign({ limit, offset }, baseQuery)
      );
      if (status !== 200) {
        break;
      }
      const { data } = body;
      ret = ret.concat(data.map((item: Artist) => solveArtist(item)));
      if (data.length < limit) {
        break;
      }
      offset += limit;
    }
  } catch {}
  return ret;
}

export async function apiCheckMusic(id: number): Promise<boolean> {
  try {
    const { status, body } = await check_music(
      Object.assign({ id }, baseQuery)
    );
    if (status !== 200) {
      return false;
    }
    const { success } = body;
    return success;
  } catch {
    return false;
  }
}

export async function apiDailySignin(): Promise<number> {
  try {
    const { status, body } = await daily_signin(baseQuery);
    if (status !== 200) {
      return 0;
    }
    const { code } = body;
    return code;
  } catch {
    return 0;
  }
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

export async function apiLike(id: number, islike?: string): Promise<boolean> {
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
    return ids;
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
    const lrc = body.lrc.lyric;
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
    return data.map((song: AnotherSongItem) => solveAnotherSongItem(song));
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
    const ret = result.map((playlist: RawPlaylistItem) =>
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
    const ret = result.map(({ song }) => solveAnotherSongItem(song));
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
    for (const [key, value] of Object.entries(categories) as [
      string,
      string
    ][]) {
      ret[value] = sub
        .filter((value: PlaylistCatlistItem) => `${value.category}` === key)
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

export async function apiPlaylistDetail(id: number): Promise<number[]> {
  const key = `playlist_detail${id}`;
  const value = apiCache.get(key);
  if (value) {
    return value as number[];
  }
  try {
    const { status, body } = await playlist_detail(
      Object.assign({ id }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { trackIds } = body.playlist;
    const ret = trackIds.map((trackId: TrackIdsItem) => {
      return trackId.id;
    });
    apiCache.set(key, ret);
    return ret;
  } catch {
    return [];
  }
}

export async function apiPlaylistSubscribe(
  id: number,
  t?: 1
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
    const ret = subscribers.map((subscriber: UserDetail) =>
      solveUserDetail(subscriber)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export async function apiPlaylistTracks(
  op: string,
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
    ret = data.map(({ songInfo }) => solveSongItem(songInfo));
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
    const ret = recommend.map((playlist: RawPlaylistItem) =>
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
    const { dailySongs } = body.data;
    const ret = dailySongs.map((song: SongsItem) => solveSongItem(song));
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
    const ret = playlists.map((playlist: RawPlaylistItem) =>
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

export enum SearchType {
  single = 1,
  album = 10,
  artist = 100,
  playlist = 1000,
  user = 1002,
  mv = 1004,
  lyric = 1006,
  dj = 1009,
  video = 1014,
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
    const { songs } = body.result;
    const ret = songs.map((song: SongsItem) => solveSongItem(song));
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
    const { albums } = body.result;
    const ret = albums.map((album: AlbumsItem) => solveAlbumsItem(album));
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
    const { artists } = body.result;
    const ret = artists.map((artist: Artist) =>
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
    const { playlists } = body.result;
    const ret = playlists.map((playlist: RawPlaylistItem) =>
      solvePlaylistItem(playlist)
    );
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
    const ret = data.map(({ searchWord, content }) => ({
      searchWord,
      content,
    }));
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
      Object.assign({ keywords, type: "mobile" }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const { allMatch } = body.result;
    const ret = allMatch.map(({ keyword }) => keyword);
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
    const ret = artists.map((artist: Artist) => solveArtist(artist));
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
    const ret = playlists.map((playlist: RawPlaylistItem) =>
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
    const ret = songs.map((song: AnotherSongItem) =>
      solveAnotherSongItem(song)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {
    return [];
  }
}

export async function apiSongDetail(trackIds: number[]): Promise<SongsItem[]> {
  let key = "";
  if (trackIds.length === 1) {
    key = `song_detail${trackIds[0]}`;
    const value = apiCache.get(key);
    if (value) {
      return value as SongsItem[];
    }
  }
  const ret: SongsItem[] = [];
  try {
    for (let i = 0; i < trackIds.length; i += 512) {
      const { status, body } = await song_detail(
        Object.assign({ ids: trackIds.slice(i, i + 512).join(",") }, baseQuery)
      );
      if (status !== 200) {
        continue;
      }
      const { songs, privileges } = body;
      for (let i = 0; i < privileges.length; ++i) {
        if (privileges[i].st >= 0) {
          ret.push(solveSongItem(songs[i]));
        }
      }
    }
    if (trackIds.length === 1) {
      apiCache.set(key, ret);
    }
    return ret;
  } catch {
    return ret;
  }
}

export async function apiSongUrl(trackIds: number[]): Promise<SongDetail[]> {
  let ret: SongDetail[] = [];
  try {
    let songs: SongDetail[] = [];
    for (let i = 0; i < trackIds.length; i += 512) {
      const { status, body } = await song_url(
        Object.assign(
          { id: trackIds.slice(i, i + 512).join(","), br: MUSIC_QUALITY },
          baseQuery
        )
      );
      if (status !== 200) {
        continue;
      }
      const { data } = body;
      songs = songs.concat(data);
    }
    ret = songs.reduce((result: SongDetail[], song: SongDetail) => {
      const { id, url, md5 } = song;
      result[trackIds.indexOf(song.id)] = { id, url, md5 };
      return result;
    }, []);
    return ret;
  } catch {
    return ret;
  }
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
    const ret = monthData.map((item: AlbumsItem) => solveAlbumsItem(item));
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
    const ret = artists.map((artist: Artist) => solveArtist(artist));
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
    const ret = playlists.map((playlist: PlaylistItem) =>
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
    const ret = playlists.map((playlist: PlaylistItem) =>
      solvePlaylistItem(playlist)
    );
    apiCache.set(key, ret);
    return ret;
  } catch {}
  return [];
}

export enum TopSong {
  all = 0,
  zh = 7,
  en = 96,
  ja = 8,
  kr = 16,
}

export async function apiTopSong(type: TopSong): Promise<SongsItem[]> {
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
    const ret = data.map((item: AnotherSongItem) => solveAnotherSongItem(item));
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
    const ret = list.map((item: RawPlaylistItem) => solvePlaylistItem(item));
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
    const { artists } = body.list;
    const ret = artists.map((artist: Artist) => solveArtist(artist));
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
    const ret = solveUserDetail(profile);
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
    const ret = followeds.map((followed: UserDetail) =>
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
    const ret = follow.map((item: UserDetail) => solveUserDetail(item));
    return ret;
  } catch {}
  return [];
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
    const ret = playlist.map((playlist: RawPlaylistItem) =>
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
  type: 0 | 1
): Promise<(SongsItem & { count: number })[]> {
  try {
    const { status, body } = await user_record(
      Object.assign({ uid: AccountManager.uid, type }, baseQuery)
    );
    if (status !== 200) {
      return [];
    }
    const data = type ? body.weekData : body.allData;
    return data.map(({ playCount, song }) => ({
      count: playCount,
      ...solveSongItem(song),
    }));
  } catch {}
  return [];
}
