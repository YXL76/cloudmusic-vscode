import {
  QueueItem,
  PlaylistItem,
  songsItem,
  trackIdsItem,
} from "../constant/type";
import { PROXY, MUSIC_QUALITY } from "../constant/setting";
import { solveSongItem } from "./util";
import { AccountManager } from "../manager/accountManager";

const {
  check_music,
  daily_signin,
  like,
  likelist,
  login_refresh,
  login_status,
  logout,
  playlist_detail,
  playmode_intelligence_list,
  scrobble,
  song_detail,
  song_url,
  user_playlist,
} = require("NeteaseCloudMusicApi");

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
    return trackIds.map((trackId: trackIdsItem) => {
      return trackId.id;
    });
  } catch {
    return [];
  }
}

export async function apiPlaymodeIntelligenceList(
  id: number,
  pid: number
): Promise<QueueItem[]> {
  let ret: QueueItem[] = [];
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
    ret = data.map((song: { songInfo: songsItem }) => {
      const { songInfo } = song;
      return solveSongItem(songInfo);
    });
  } catch {}
  return ret;
}

export async function apiScrobble(id: number, sourceid: number, time: number) {
  await scrobble({
    id,
    sourceid,
    time,
    cookie: AccountManager.cookie,
    proxy: PROXY,
  });
}

export async function apiSongDetail(trackIds: number[]): Promise<QueueItem[]> {
  let ret: QueueItem[] = [];
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
      ret = ret.concat(songs.map((song: songsItem) => solveSongItem(song)));
    }
    return ret;
  } catch {
    return ret;
  }
}

export async function apiSongUrl(trackIds: number[]): Promise<string[]> {
  let ret: string[] = [];
  try {
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
      ret = ret.concat(
        data.reduce((result: string[], song: { id: number; url: string }) => {
          result[trackIds.indexOf(song.id)] = song.url;
          return result;
        }, [])
      );
    }
    return ret;
  } catch {
    return ret;
  }
}

export async function apiUserPlaylist(): Promise<PlaylistItem[]> {
  try {
    let ret: PlaylistItem[] = [];
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
