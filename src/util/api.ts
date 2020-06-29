import {
  QueueItem,
  PlaylistItem,
  songsItem,
  trackIdsItem,
} from "../constant/type";

import { solveSongItem } from "./util";

const {
  daily_signin,
  login_refresh,
  login_status,
  logout,
  playlist_detail,
  playmode_intelligence_list,
  song_detail,
  song_url,
  user_playlist,
} = require("NeteaseCloudMusicApi");

export async function API_dailySignin(): Promise<number> {
  try {
    const { status, body } = await daily_signin();
    if (status !== 200) {
      return 0;
    }
    const { code } = body;
    return code;
  } catch {
    return 0;
  }
}

export async function API_loginRefresh(cookie: string): Promise<boolean> {
  try {
    const { status } = await login_refresh({ cookie });
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function API_loginStatus(cookie: string): Promise<boolean> {
  try {
    const { status } = await login_status({
      cookie,
    });
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function API_logout(cookie: string): Promise<boolean> {
  try {
    const { status } = await logout({
      cookie,
    });
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function API_playlistDetail(
  id: number,
  cookie: string
): Promise<number[]> {
  try {
    const { status, body } = await playlist_detail({
      id,
      cookie,
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

export async function API_playmodeIntelligenceList(
  id: number,
  pid: number,
  cookie: string
): Promise<QueueItem[]> {
  let ret: QueueItem[] = [];
  try {
    const { body, status } = await playmode_intelligence_list({
      id,
      pid,
      cookie,
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

export async function API_songDetail(
  trackIds: number[],
  cookie: string
): Promise<QueueItem[]> {
  let ret: QueueItem[] = [];
  try {
    for (let i = 0; i < trackIds.length; i += 64) {
      const { status, body } = await song_detail({
        ids: trackIds.slice(i, i + 64).join(","),
        cookie,
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

export async function API_songUrl(
  trackIds: number[],
  cookie: string,
  br?: number
): Promise<string[]> {
  let ret: string[] = [];
  try {
    for (let i = 0; i < trackIds.length; i += 64) {
      const { status, body } = await song_url({
        id: trackIds.slice(i, i + 64).join(","),
        br,
        cookie,
      });
      if (status !== 200) {
        continue;
      }
      const { data } = body;
      ret = ret.concat(data.map((song: { url: string }) => song.url));
    }
    return ret;
  } catch {
    return ret;
  }
}

export async function API_userPlaylist(
  uid: number,
  cookie: string
): Promise<PlaylistItem[]> {
  try {
    let ret: PlaylistItem[] = [];
    const { status, body } = await user_playlist({
      uid,
      cookie,
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
    } of playlist) {
      ret.push({
        description,
        id,
        name,
        playCount,
        subscribedCount,
        trackCount,
      });
    }
    return ret;
  } catch {
    return [];
  }
}
