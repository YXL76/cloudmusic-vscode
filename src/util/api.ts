import {
  QueueItem,
  PlaylistItem,
  songsItem,
  trackIdsItem,
} from "../constant/type";
import { MUSIC_QUALITY } from "../constant/setting";
import { solveSongItem } from "./util";
import { AccountManager } from "../manager/accountManager";

const {
  check_music,
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

export async function API_checkMusic(id: number): Promise<boolean> {
  try {
    const { status, body } = await check_music({
      id,
      cookie: AccountManager.cookie,
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

export async function API_loginRefresh(): Promise<boolean> {
  try {
    const { status } = await login_refresh({ cookie: AccountManager.cookie });
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function API_loginStatus(): Promise<boolean> {
  try {
    const { status } = await login_status({
      cookie: AccountManager.cookie,
    });
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function API_logout(): Promise<boolean> {
  try {
    const { status } = await logout({
      cookie: AccountManager.cookie,
    });
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function API_playlistDetail(id: number): Promise<number[]> {
  try {
    const { status, body } = await playlist_detail({
      id,
      cookie: AccountManager.cookie,
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
  pid: number
): Promise<QueueItem[]> {
  let ret: QueueItem[] = [];
  try {
    const { body, status } = await playmode_intelligence_list({
      id,
      pid,
      cookie: AccountManager.cookie,
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

export async function API_songDetail(trackIds: number[]): Promise<QueueItem[]> {
  let ret: QueueItem[] = [];
  try {
    for (let i = 0; i < trackIds.length; i += 64) {
      const { status, body } = await song_detail({
        ids: trackIds.slice(i, i + 64).join(","),
        cookie: AccountManager.cookie,
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
  trackIds: number[]
): Promise<Map<number, string>> {
  let ret: Map<number, string> = new Map<number, string>();
  try {
    for (let i = 0; i < trackIds.length; i += 64) {
      const { status, body } = await song_url({
        id: trackIds.slice(i, i + 64).join(","),
        br: MUSIC_QUALITY,
        cookie: AccountManager.cookie,
      });
      if (status !== 200) {
        continue;
      }
      const { data } = body;
      for (const song of data) {
        const { id, url } = song;
        ret.set(id, url);
      }
    }
    return ret;
  } catch {
    return ret;
  }
}

export async function API_userPlaylist(): Promise<PlaylistItem[]> {
  try {
    let ret: PlaylistItem[] = [];
    const { status, body } = await user_playlist({
      uid: AccountManager.uid,
      cookie: AccountManager.cookie,
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
