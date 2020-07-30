import {
  Artist,
  AlbumsItem,
  PlaylistItem,
  SongsItem,
  AnotherSongItem,
  TrackIdsItem,
  SongDetail,
  LyricData,
} from "../constant/type";
import { PROXY, MUSIC_QUALITY } from "../constant/setting";
import { LyricCache } from "./cache";
import {
  solveArtist,
  solveAlbumsItem,
  solveSongItem,
  solveAnotherSongItem,
} from "./util";
import { AccountManager } from "../manager/accountManager";

const {
  album,
  artists,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  artist_album,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  check_music,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  daily_signin,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  fm_trash,
  like,
  likelist,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  login_refresh,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  login_status,
  logout,
  lyric,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  personal_fm,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  playlist_detail,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  playlist_tracks,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  playmode_intelligence_list,
  scrobble,
  search,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  simi_song,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  song_detail,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  song_url,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  user_playlist,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  user_record,
} = require("NeteaseCloudMusicApi");

// TODO cache
export async function apiAlbum(
  id: number
): Promise<{ info: AlbumsItem; songs: SongsItem[] }> {
  let info: AlbumsItem = {
    artists: [],
    alias: [],
    company: "",
    description: "",
    subType: "",
    name: "",
    id: 0,
  };
  try {
    const { status, body } = await album({
      id,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
    if (status !== 200) {
      return { info, songs: [] };
    }
    const { songs } = body;
    info = solveAlbumsItem(body.album);
    return {
      info,
      songs: songs.map((song: SongsItem) => solveSongItem(song)),
    };
  } catch {
    return { info, songs: [] };
  }
}

export async function apiArtists(
  id: number
): Promise<{ info: Artist; songs: SongsItem[] }> {
  const info: Artist = {
    name: "",
    id: 0,
    alias: [],
    briefDesc: "",
    albumSize: 0,
  };
  try {
    const { status, body } = await artists({
      id,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
    if (status !== 200) {
      return { info, songs: [] };
    }
    const { artist, hotSongs } = body;
    return {
      info: solveArtist(artist),
      songs: hotSongs.map((song: SongsItem) => solveSongItem(song)),
    };
  } catch {
    return { info, songs: [] };
  }
}

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

// TODO cache
export async function apiPlaylistDetail(id: number): Promise<number[]> {
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
    return trackIds.map((trackId: TrackIdsItem) => {
      return trackId.id;
    });
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

enum SearchType {
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

export async function apiSearchSingle(keywords: string): Promise<SongsItem[]> {
  try {
    const { body, status } = await search({
      keywords,
      type: SearchType.single,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
    if (status !== 200) {
      return [];
    }
    const { result } = body;
    const { songs } = result;
    return songs.map((song: AnotherSongItem) => solveAnotherSongItem(song));
  } catch {}
  return [];
}

// TODO cache
export async function apiSimiSong(id: number): Promise<number[]> {
  const ret: number[] = [];
  try {
    const { body, status } = await simi_song({
      id,
      cookie: AccountManager.cookie,
      proxy: PROXY,
    });
    if (status !== 200) {
      return ret;
    }
    const { songs } = body;
    /*for (const { name, id, duration, alias, artists, album } of songs) {
      ret.push({
        name,
        id,
        dt: duration,
        alia: alias,
        ar: artists.map((artist: { name: string; id: number }) => {
          return { name: artist.name, id: artist.id };
        }),
        al: {
          name: album.name,
          id: album.id,
        },
      });
    }*/
    for (const { id } of songs) {
      ret.push(id);
    }
    return ret;
  } catch {
    return ret;
  }
}

export async function apiSongDetail(trackIds: number[]): Promise<SongsItem[]> {
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
): Promise<{ count: number; song: SongsItem }[]> {
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
      song: solveSongItem(song),
    }));
  } catch {}
  return [];
}
