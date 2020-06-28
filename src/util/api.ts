import { AccountManager } from "../api/accountManager";
import { PlaylistItem } from "../constant/type";

const {
  daily_signin,
  login_refresh,
  login_status,
  logout,
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
