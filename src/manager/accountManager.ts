import {
  apiDailySignin,
  apiLikelist,
  apiLoginRefresh,
  apiLoginStatus,
  apiLogout,
  apiUserPlaylist,
} from "../util";
import { login, login_cellphone } from "NeteaseCloudMusicApi";
import { LoggedIn } from "../state";
import { PlaylistItem } from "../constant";
import { cookieToJson } from "NeteaseCloudMusicApi/util/index";
import { i18n } from "../i18n";
import { window } from "vscode";

export class AccountManager {
  static cookie = {};
  static uid = 0;
  static nickname = "";
  static likelist: Set<number> = new Set<number>();

  static async dailySignin(): Promise<void> {
    if (LoggedIn.get()) {
      const code = await apiDailySignin();
      if (code === 200) {
        window.showInformationMessage(i18n.sentence.success.dailyCheck);
      }
    } else {
      window.showErrorMessage(i18n.sentence.error.needSignIn);
    }
  }

  static async login(
    phone: boolean,
    account: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    md5_password: string
  ): Promise<boolean> {
    if (LoggedIn.get()) {
      window.showInformationMessage(i18n.sentence.info.alreadySignIn);
      return true;
    }
    try {
      const { status, body } = phone
        ? await login_cellphone({
            phone: account,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            md5_password,
          })
        : await login({
            email: account,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            md5_password,
          });

      if (status === 200) {
        const { cookie, profile } = body;
        const { userId, nickname } = profile;
        this.cookie = cookieToJson(cookie);
        this.uid = userId;
        this.nickname = nickname;
        const ids = await apiLikelist();
        ids.forEach((id) => this.likelist.add(id));
        LoggedIn.set(true);
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
      this.cookie = {};
      this.uid = 0;
      this.nickname = "";
      this.likelist.clear();
      LoggedIn.set(false);
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
