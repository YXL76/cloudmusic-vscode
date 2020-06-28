import { AccountManager } from "../api/accountManager";
import {
  PlaylistContent,
  PlaylistItem,
  songsItem,
  trackIdsItem,
} from "../constant/type";

const {
  daily_signin,
  login_refresh,
  login_status,
  logout,
  playlist_detail,
  song_detail,
  user_playlist,
} = require("NeteaseCloudMusicApi");

const user = AccountManager.getInstance();

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
    const { status } = await login_refresh({ cookie: user.cookie });
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
      cookie: user.cookie,
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
      cookie: user.cookie,
    });
    if (status !== 200) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function API_userPlaylist(): Promise<PlaylistItem[]> {
  try {
    let ret: PlaylistItem[] = [];
    const { status, body } = await user_playlist({
      uid: user.uid,
      cookie: user.cookie,
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

export async function API_playlistDetail(id: number): Promise<number[]> {
  try {
    const { status, body } = await playlist_detail({
      id: id,
      cookie: user.cookie,
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

export async function API_songDetail(
  trackIds: number[]
): Promise<PlaylistContent[]> {
  let ret: PlaylistContent[] = [];
  try {
    for (let i = 0; i < trackIds.length; i += 64) {
      const { status, body } = await song_detail({
        ids: trackIds.slice(i, i + 64).join(","),
        cookie: user.cookie,
      });
      if (status !== 200) {
        continue;
      }
      const { songs } = body;
      ret = ret.concat(
        songs.map((song: songsItem) => {
          const { name, id, alia, ar } = song;
          return { name, id, alia: alia ? alia[0] : "", arName: ar[0].name };
        })
      );
    }
    return ret;
  } catch {
    return ret;
  }
}
