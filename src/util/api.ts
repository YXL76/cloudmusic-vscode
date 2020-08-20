import {
  AlbumsItem,
  AnotherSongItem,
  Artist,
  LyricData,
  PlaylistItem,
  SongDetail,
  SongsItem,
  TrackIdsItem,
} from "../constant";
import { MUSIC_QUALITY, PROXY } from "../constant";
import {
  album,
  artist_album,
  artists,
  check_music,
  daily_signin,
  fm_trash,
  like,
  likelist,
  login_refresh,
  login_status,
  logout,
  lyric,
  personal_fm,
  playlist_detail,
  playlist_tracks,
  playmode_intelligence_list,
  scrobble,
  search,
  search_hot_detail,
  simi_song,
  song_detail,
  song_url,
  user_playlist,
  user_record,
} from "NeteaseCloudMusicApi";
import {
  solveAlbumsItem,
  solveAnotherSongItem,
  solveArtist,
  solveSongItem,
} from "./util";
import { AccountManager } from "../manager";
import { LyricCache } from "./cache";
import NodeCache = require("node-cache");

const apiCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 600,
  useClones: true,
  deleteOnExpire: true,
  enableLegacyCallbacks: false,
  maxKeys: -1,
});

export async function apiAlbum(
  id: number
): Promise<{ info: AlbumsItem; songs: SongsItem[] }> {
  const key = `album${id}`;
  const value = apiCache.get(key);
  if (value) {
    return value as { info: AlbumsItem; songs: SongsItem[] };
  }
  try {
    const { status, body } = await album({
      id,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
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

export async function apiArtists(
  id: number
): Promise<{ info: Artist; songs: SongsItem[] }> {
  const key = `artists${id}`;
  const value = apiCache.get(key);
  if (value) {
    return value as { info: Artist; songs: SongsItem[] };
  }
  try {
    const { status, body } = await artists({
      id,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
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

// TODO refactor
export async function apiArtistAlbum(id: number): Promise<AlbumsItem[]> {
  let ret: AlbumsItem[] = [];
  const limit = 50;
  let offset = 0;
  try {
    while (true) {
      const { status, body } = await artist_album({
        id,
        limit,
        offset,
        cookie: AccountManager.cookie,
        proxy: PROXY,
      });
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
  return ret;
}

export async function apiCheckMusic(id: number): Promise<boolean> {
  try {
    const { status, body } = await check_music({
      id,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
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
    const { status, body } = await daily_signin({
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
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
    const { status } = await fm_trash({
      id,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
    if (status === 200) {
      return true;
    }
  } catch {}
  return false;
}

export async function apiLike(id: number, islike?: string): Promise<boolean> {
  try {
    const { status } = await like({
      id,
      like: islike,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
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
    const { status, body } = await likelist({
      uid: AccountManager.uid,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
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
    const { status } = await login_refresh({
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
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
    const { status } = await login_status({
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
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
    const { status } = await logout({
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
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
    const { status, body } = await lyric({
      id,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
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
    const { status, body } = await personal_fm({
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
    if (status !== 200) {
      return [];
    }
    const { data } = body;
    return data.map((song: AnotherSongItem) => solveAnotherSongItem(song));
  } catch {
    return [];
  }
}

export async function apiPlaylistDetail(id: number): Promise<number[]> {
  const key = `playlist_detail${id}`;
  const value = apiCache.get(key);
  if (value) {
    return value as number[];
  }
  try {
    const { status, body } = await playlist_detail({
      id,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
    if (status !== 200) {
      return [];
    }
    const { playlist } = body;
    const { trackIds } = playlist;
    const ret = trackIds.map((trackId: TrackIdsItem) => {
      return trackId.id;
    });
    apiCache.set(key, ret);
    return ret;
  } catch {
    return [];
  }
}

export async function apiPlaylistTracks(
  op: string,
  pid: number,
  tracks: number[]
): Promise<boolean> {
  try {
    const { status } = await playlist_tracks({
      op,
      pid,
      tracks: tracks.join(","),
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function apiPlaymodeIntelligenceList(
  id: number,
  pid: number
): Promise<SongsItem[]> {
  let ret: SongsItem[] = [];
  try {
    const { body, status } = await playmode_intelligence_list({
      id,
      pid,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
    if (status !== 200) {
      return ret;
    }
    const { data } = body;
    ret = data.map(({ songInfo }) => solveSongItem(songInfo));
  } catch {}
  return ret;
}

export async function apiScrobble(
  id: number,
  sourceid: number,
  time: number
): Promise<void> {
  await scrobble({
    id,
    sourceid,
    time: Math.floor(time),
    cookie: AccountManager.cookie,
    proxy: PROXY,
  });
}

export enum SearchType {
  single = 1,
  album = 10,
  artist = 100,
  mix = 1000,
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
    const { body, status } = await search({
      keywords,
      type: SearchType.single,
      limit,
      offset,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
    if (status !== 200) {
      return [];
    }
    const { result } = body;
    const { songs } = result;
    const ret = songs.map((song: AnotherSongItem) =>
      solveAnotherSongItem(song)
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
    const { body, status } = await search({
      keywords,
      type: SearchType.album,
      limit,
      offset,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
    if (status !== 200) {
      return [];
    }
    const { result } = body;
    const { albums } = result;
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
    const { body, status } = await search({
      keywords,
      type: SearchType.artist,
      limit,
      offset,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
    if (status !== 200) {
      return [];
    }
    const { result } = body;
    const { artists } = result;
    const ret = artists.map((artist: Artist) =>
      solveArtist({ ...artist, briefDesc: "" })
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
    const { body, status } = await search_hot_detail({
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
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

export async function apiSimiSong(id: number): Promise<SongsItem[]> {
  const key = `simi_song${id}`;
  const value = apiCache.get(key);
  if (value) {
    return value as SongsItem[];
  }
  try {
    const { body, status } = await simi_song({
      id,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
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
  let ret: SongsItem[] = [];
  try {
    for (let i = 0; i < trackIds.length; i += 512) {
      const { status, body } = await song_detail({
        ids: trackIds.slice(i, i + 512).join(","),
        cookie: AccountManager.cookie,
        proxy: PROXY,
      });
      if (status !== 200) {
        continue;
      }
      const { songs } = body;
      ret = ret.concat(songs.map((song: SongsItem) => solveSongItem(song)));
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
      const { status, body } = await song_url({
        id: trackIds.slice(i, i + 512).join(","),
        br: MUSIC_QUALITY,
        cookie: AccountManager.cookie,
        proxy: PROXY,
      });
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

export async function apiUserPlaylist(): Promise<PlaylistItem[]> {
  try {
    const ret: PlaylistItem[] = [];
    const { status, body } = await user_playlist({
      uid: AccountManager.uid,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
    if (status !== 200) {
      return ret;
    }
    const { playlist } = body;
    for (const {
      description,
      id,
      name,
      playCount,
      subscribedCount,
      trackCount,
      creator,
    } of playlist) {
      ret.push({
        description,
        id,
        name,
        playCount,
        subscribedCount,
        trackCount,
        userId: creator.userId,
      });
    }
    return ret;
  } catch {
    return [];
  }
}

export async function apiUserRecord(
  type: 0 | 1
): Promise<(SongsItem & { count: number })[]> {
  try {
    const { status, body } = await user_record({
      uid: AccountManager.uid,
      type,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
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
