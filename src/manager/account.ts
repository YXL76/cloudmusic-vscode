import { ACCOUNT_KEY, COOKIE_KEY } from "../constant";
import {
  apiLikelist,
  apiLogin,
  apiLoginCellphone,
  apiLoginStatus,
  apiLogout,
  apiUserPlaylist,
  base,
} from "../api";
import type { Account } from "../constant";
import type { Cookie } from "../api";
import type { ExtensionContext } from "vscode";
import { LoggedIn } from "../state";

export class AccountManager {
  static uid = 0;

  static nickname = "";

  static likelist: Set<number> = new Set<number>();

  static context: ExtensionContext;

  static async login(account?: Account) {
    if (LoggedIn.get()) {
      return true;
    }
    try {
      const res = account
        ? account.phone.length > 0
          ? await apiLoginCellphone(
              account.phone,
              account.countrycode,
              account.password
            )
          : await apiLogin(account.username, account.password)
        : await apiLoginStatus();

      if (res) {
        const { userId, nickname } = res;
        this.uid = userId;
        this.nickname = nickname;
        LoggedIn.set(true);

        void this.context.globalState.update(ACCOUNT_KEY, account);
        void this.context.globalState.update(COOKIE_KEY, base.cookie);

        void apiLikelist().then((ids) => {
          this.likelist = new Set<number>(ids);
        });

        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  }

  static async logout() {
    if (await apiLogout()) {
      void this.context.globalState.update(ACCOUNT_KEY, undefined);
      void this.context.globalState.update(COOKIE_KEY, undefined);

      base.cookie = {} as Cookie;
      this.uid = 0;
      this.nickname = "";
      this.likelist.clear();
      LoggedIn.set(false);

      return true;
    }
    return false;
  }

  static async userPlaylist() {
    if (this.uid === 0) {
      return [];
    }
    const lists = await apiUserPlaylist(this.uid);
    return lists.filter((list) => list.creator.userId === this.uid);
  }

  static async favoritePlaylist() {
    if (this.uid === 0) {
      return [];
    }
    const lists = await apiUserPlaylist(this.uid);
    return lists.filter((list) => list.creator.userId !== this.uid);
  }
}
