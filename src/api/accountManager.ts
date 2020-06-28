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
  private static instance: AccountManager;

  private phone: boolean = false;
  private account: string = "";
  private password: string = "";

  public loggedIn: boolean = false;
  public cookie: string = "";
  public uid: number = 0;
  public nickname: string = "";

  constructor() {}

  static getInstance(): AccountManager {
    return this.instance
      ? this.instance
      : (this.instance = new AccountManager());
  }

  update(phone: boolean, account: string, password: string) {
    this.phone = phone;
    this.account = account;
    this.password = password;
  }

  async dailySignin() {
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

  async login(): Promise<boolean> {
    if (this.loggedIn) {
      return true;
    }
    try {
      const { status, body } = this.phone
        ? await login_cellphone({
            phone: this.account,
            password: this.password,
          })
        : await login({
            username: this.account,
            password: this.password,
          });

      if (status === 200) {
        const { cookie, profile } = body;
        const { userId, nickname } = profile;
        this.loggedIn = true;
        this.cookie = cookie;
        this.uid = userId;
        this.nickname = nickname;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async loginRefresh() {
    await API_loginRefresh(this.cookie);
  }

  async loginStatus() {
    await API_loginStatus(this.cookie);
  }

  async logout() {
    if (await API_logout(this.cookie)) {
      this.loggedIn = false;
    }
  }

  async playlist(): Promise<PlaylistItem[]> {
    return await API_userPlaylist(this.uid, this.cookie);
  }
}
