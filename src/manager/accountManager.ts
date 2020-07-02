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
const { login, login_cellphone } = require("NeteaseCloudMusicApi");
const { cookieToJson } = require("NeteaseCloudMusicApi/util/index");

export class AccountManager {
  static loggedIn: boolean = false;
  static cookie: object = {};
  static uid: number = 0;
  static nickname: string = "";
  static likelist: Set<number> = new Set<number>();

  constructor() {}

  static async dailySignin() {
    if (this.loggedIn) {
      const code = await apiDailySignin();
      switch (code) {
        case 200:
          window.showInformationMessage("签到成功");
          break;
        case -2:
          window.showWarningMessage("重复签到");
          break;
        default:
          window.showErrorMessage("签到失败");
          break;
      }
    } else {
      window.showErrorMessage("请登录帐号");
    }
  }

  static async login(
    phone: boolean,
    account: string,
    password: string
  ): Promise<boolean> {
    if (this.loggedIn) {
      window.showInformationMessage("已登录");
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
        this.loggedIn = true;
        this.cookie = cookieToJson(cookie);
        this.uid = userId;
        this.nickname = nickname;
        const ids = await apiLikelist();
        ids.forEach((id) => this.likelist.add(id));
        window.showInformationMessage("登录成功");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  static async loginRefresh() {
    await apiLoginRefresh();
  }

  static async loginStatus() {
    await apiLoginStatus();
  }

  static async logout(): Promise<boolean> {
    if (await apiLogout()) {
      this.loggedIn = false;
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
}
