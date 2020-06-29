import { window } from "vscode";
import { PlaylistItem } from "../constant/type";
import {
  API_dailySignin,
  API_loginRefresh,
  API_loginStatus,
  API_logout,
  API_userPlaylist,
} from "../util/api";
const { login, login_cellphone } = require("NeteaseCloudMusicApi");

export class AccountManager {
  public static loggedIn: boolean = false;
  public static cookie: string = "";
  public static uid: number = 0;
  public static nickname: string = "";

  constructor() {}

  static async dailySignin() {
    if (this.loggedIn) {
      const code = await API_dailySignin();
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
        this.cookie = cookie;
        this.uid = userId;
        this.nickname = nickname;
        window.showInformationMessage("登录成功");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  static async loginRefresh() {
    await API_loginRefresh(this.cookie);
  }

  static async loginStatus() {
    await API_loginStatus(this.cookie);
  }

  static async logout() {
    if (await API_logout(this.cookie)) {
      this.loggedIn = true;
      this.cookie = "";
      this.uid = 0;
      this.nickname = "";
    }
  }

  static async playlist(): Promise<PlaylistItem[]> {
    return await API_userPlaylist(this.uid, this.cookie);
  }
}
