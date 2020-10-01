import {
  apiDailySignin,
  apiLikelist,
  apiLogout,
  apiUserPlaylist,
  baseQuery,
} from "../util";
import { login, login_cellphone } from "NeteaseCloudMusicApi";
import { LoggedIn } from "../state";
import type { PlaylistItem } from "../constant";
import { cookieToJson } from "NeteaseCloudMusicApi/util/index";
import { i18n } from "../i18n";
import { window } from "vscode";

interface LoginParameters {
  phone: boolean;
  account: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  md5_password: string;
  countrycode?: string;
}

export class AccountManager {
  static uid = 0;

  static nickname = "";

  static likelist: Set<number> = new Set<number>();

  static async dailySignin(): Promise<void> {
    if (LoggedIn.get()) {
      if (await apiDailySignin()) {
        void window.showInformationMessage(i18n.sentence.success.dailyCheck);
      }
    } else {
      void window.showErrorMessage(i18n.sentence.error.needSignIn);
    }
  }

  static async login({
    phone,
    account,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    md5_password,
    countrycode,
  }: LoginParameters): Promise<boolean> {
    if (LoggedIn.get()) {
      void window.showInformationMessage(i18n.sentence.info.alreadySignIn);
      return true;
    }
    try {
      const { status, body } = phone
        ? await login_cellphone({
            phone: account,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            md5_password,
            countrycode: countrycode || "86",
            cookie: {},
          })
        : await login({
            email: account,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            md5_password,
            cookie: {},
          });

      if (status === 200) {
        const { cookie, profile } = body;
        const { userId, nickname } = profile as {
          userId: number;
          nickname: string;
        };
        baseQuery.cookie = cookieToJson(cookie);
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

  static async logout(): Promise<boolean> {
    if (await apiLogout()) {
      baseQuery.cookie = {};
      this.uid = 0;
      this.nickname = "";
      this.likelist.clear();
      LoggedIn.set(false);
      return true;
    }
    return false;
  }

  static async userPlaylist(): Promise<PlaylistItem[]> {
    const lists = await apiUserPlaylist(this.uid);
    return lists.filter((list) => list.creator.userId === this.uid);
  }

  static async favoritePlaylist(): Promise<PlaylistItem[]> {
    const lists = await apiUserPlaylist(this.uid);
    return lists.filter((list) => list.creator.userId !== this.uid);
  }
}
