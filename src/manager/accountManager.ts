import { window } from "vscode";
import { PlaylistItem } from "../constant/type";
import {
  apiDailySignin,
  apiLikelist,
  apiLoginRefresh,
  apiLoginStatus,
  apiLogout,
  apiUserPlaylist,
} from "../util/api";
import { loggedIn } from "../state/login";
// eslint-disable-next-line @typescript-eslint/naming-convention
const { login, login_cellphone } = require("NeteaseCloudMusicApi");
const { cookieToJson } = require("NeteaseCloudMusicApi/util/index");

export class AccountManager {
  static cookie = {};
  static uid = 0;
  static nickname = "";
  static likelist: Set<number> = new Set<number>();

  static async dailySignin(): Promise<void> {
    if (loggedIn.get()) {
      const code = await apiDailySignin();
      if (code === 200) {
        window.showInformationMessage("Daily check success");
      }
    } else {
      window.showErrorMessage("Please sign in");
    }
  }

  static async login(
    phone: boolean,
    account: string,
    password: string
  ): Promise<boolean> {
    if (loggedIn.get()) {
      window.showInformationMessage("Already sign in");
      return true;
    }
    try {
      const { status, body } = phone
        ? await login_cellphone({
            phone: account,
            password: encodeURIComponent(password),
          })
        : await login({
            username: account,
            password: encodeURIComponent(password),
          });

      if (status === 200) {
        const { cookie, profile } = body;
        const { userId, nickname } = profile;
        loggedIn.set(true);
        this.cookie = cookieToJson(cookie);
        this.uid = userId;
        this.nickname = nickname;
        const ids = await apiLikelist();
        ids.forEach((id) => this.likelist.add(id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  static async loginRefresh(): Promise<void> {
    await apiLoginRefresh();
  }

  static async loginStatus(): Promise<void> {
    await apiLoginStatus();
  }

  static async logout(): Promise<boolean> {
    if (await apiLogout()) {
      loggedIn.set(false);
      this.cookie = {};
      this.uid = 0;
      this.nickname = "";
      this.likelist.clear();
      return true;
    }
    return false;
  }

  static async playlist(): Promise<PlaylistItem[]> {
    return await apiUserPlaylist();
  }

  static async userPlaylist(): Promise<PlaylistItem[]> {
    const lists = await apiUserPlaylist();
    return lists.filter((list) => list.userId === AccountManager.uid);
  }

  static async favoritePlaylist(): Promise<PlaylistItem[]> {
    const lists = await apiUserPlaylist();
    return lists.filter((list) => list.userId !== AccountManager.uid);
  }
}
