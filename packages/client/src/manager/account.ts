import {
  ACCOUNT_KEY,
  AUTH_PROVIDER_ID,
  AUTO_CHECK,
  COOKIE_KEY,
} from "../constant";
import type { Account, PlaylistItem, RadioDetail } from "../constant";
import type {
  AuthenticationProvider,
  AuthenticationProviderAuthenticationSessionsChangeEvent,
  AuthenticationSession,
  ExtensionContext,
} from "vscode";
import { EventEmitter, authentication, window } from "vscode";
import { MultiStepInput, State } from "../util";
import {
  apiDailySigninAndroid,
  apiDailySigninWeb,
  apiDjSublist,
  apiLikelist,
  apiLogin,
  apiLoginCellphone,
  apiLoginStatus,
  apiLogout,
  apiUserPlaylist,
  apiYunbeiInfo,
  apiYunbeiSign,
  apiYunbeiToday,
  cookieToJson,
} from "../api";
import type { Cookie } from "../api";
import { Webview } from "../webview";
import { createHash } from "crypto";
import i18n from "../i18n";

export class AccountManager implements AuthenticationProvider {
  static uid = 0;

  static nickname = "0";

  static context: ExtensionContext;

  static cookie = {} as Cookie;

  static readonly likelist: Set<number> = new Set<number>();

  private static instance: AccountManager;

  // like AuthenticationSession
  private static readonly session = {
    id: "cloudmusic-auth-session",
    accessToken: "",
    scopes: [] as string[],
  };

  private static get sessions() {
    return [
      {
        ...AccountManager.session,
        account: {
          id: `${AccountManager.uid}`,
          label: AccountManager.nickname,
        },
      },
    ];
  }

  _onDidChangeSessions = new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();

  readonly onDidChangeSessions = this._onDidChangeSessions.event;

  static async getInstance(): Promise<AccountManager> {
    try {
      const cookieStr = await this.context.secrets.get(COOKIE_KEY);
      if (cookieStr) {
        this.cookie = JSON.parse(cookieStr) as Cookie;
        if ((await this.login()) && AUTO_CHECK) void this.dailyCheck();
      }
    } catch (err) {
      console.error(err);
    }
    return this.instance || (this.instance = new AccountManager());
  }

  static async dailyCheck(): Promise<boolean> {
    try {
      const actions = [];
      const [yunbei, { mobileSign, pcSign }] = await Promise.all([
        apiYunbeiToday(),
        apiYunbeiInfo(),
      ]);
      if (!yunbei) actions.push(apiYunbeiSign());
      if (!mobileSign) actions.push(apiDailySigninAndroid());
      if (!pcSign) actions.push(apiDailySigninWeb());
      await Promise.all(actions);
      return true;
    } catch {}
    return false;
  }

  static async userPlaylist(): Promise<PlaylistItem[]> {
    if (this.uid === 0) return [];
    const lists = await apiUserPlaylist(this.uid);
    return lists.filter((list) => list.creator.userId === this.uid);
  }

  static async favoritePlaylist(): Promise<PlaylistItem[]> {
    if (this.uid === 0) return [];
    const lists = await apiUserPlaylist(this.uid);
    return lists.filter((list) => list.creator.userId !== this.uid);
  }

  static async djradio(): Promise<RadioDetail[]> {
    if (this.uid === 0) return [];
    return await apiDjSublist();
  }

  private static async logout(): Promise<boolean> {
    if (!(await apiLogout())) return false;

    void this.context.secrets.delete(ACCOUNT_KEY);
    void this.context.secrets.delete(COOKIE_KEY);

    this.cookie = {} as Cookie;
    this.uid = 0;
    this.nickname = "";
    this.likelist.clear();
    State.login = false;

    return true;
  }

  private static async login(): Promise<boolean> {
    if (State.login) return true;

    let account: Account | undefined = undefined;
    try {
      const accountStr = await this.context.secrets.get(ACCOUNT_KEY);
      if (accountStr) account = JSON.parse(accountStr) as Account;
    } catch (err) {
      console.error(account);
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
        this.likelist.clear();
        State.login = true;

        void this.context.secrets.store(
          COOKIE_KEY,
          JSON.stringify(this.cookie)
        );

        void apiLikelist().then((ids) =>
          ids.forEach((v) => this.likelist.add(v))
        );

        return true;
      }
    } catch (err) {
      console.error(err);
      void window.showErrorMessage(i18n.sentence.fail.signIn);
      void this.context.secrets.delete(ACCOUNT_KEY);
      void this.context.secrets.delete(COOKIE_KEY);
    }
    return false;
  }

  private static async loginQuickPick(): Promise<void> {
    if (State.login) return;

    const title = i18n.word.signIn;
    let totalSteps = 3;
    const state: Account = {
      phone: "",
      username: "",
      password: "",
      countrycode: "86",
    };

    await MultiStepInput.run((input) => pickMethod(input));

    const enum Type {
      emial,
      phone,
      qrcode,
      cookie,
    }

    async function pickMethod(input: MultiStepInput) {
      const pick = await input.showQuickPick({
        title,
        step: 1,
        totalSteps,
        items: [
          {
            label: `$(mail) ${i18n.word.email}`,
            description: i18n.sentence.label.email,
            type: Type.emial,
          },
          {
            label: `$(device-mobile) ${i18n.word.cellphone}`,
            description: i18n.sentence.label.cellphone,
            type: Type.phone,
          },
          {
            label: `$(diff) ${i18n.word.qrcode}`,
            description: i18n.sentence.label.qrcode,
            type: Type.qrcode,
          },
          {
            label: "$(database) Cookie",
            type: Type.cookie,
          },
        ],
        placeholder: i18n.sentence.hint.signIn,
      });
      switch (pick.type) {
        case Type.phone:
          totalSteps = 4;
          return (input: MultiStepInput) => inputCountrycode(input);
        case Type.emial:
          totalSteps = 3;
          return (input: MultiStepInput) => inputUsername(input);
        case Type.cookie:
          totalSteps = 2;
          return (input: MultiStepInput) => inputCookie(input);
        case Type.qrcode:
          await Webview.login();
          await AccountManager.context.secrets.delete(ACCOUNT_KEY);
      }
      return;
    }

    async function inputCountrycode(input: MultiStepInput) {
      state.countrycode = await input.showInputBox({
        title,
        step: 2,
        totalSteps,
        value: state.countrycode,
        prompt: i18n.sentence.hint.countrycode,
      });
      return (input: MultiStepInput) => inputPhone(input);
    }

    async function inputPhone(input: MultiStepInput) {
      state.phone = await input.showInputBox({
        title,
        step: totalSteps - 1,
        totalSteps,
        value: state.phone,
        prompt: i18n.sentence.hint.account,
      });
      state.username = "";
      return (input: MultiStepInput) => inputPassword(input);
    }

    async function inputUsername(input: MultiStepInput) {
      state.username = await input.showInputBox({
        title,
        step: totalSteps - 1,
        totalSteps,
        value: state.username,
        prompt: i18n.sentence.hint.account,
      });
      state.phone = "";
      return (input: MultiStepInput) => inputPassword(input);
    }

    async function inputCookie(input: MultiStepInput) {
      AccountManager.cookie = cookieToJson([
        await input.showInputBox({
          title,
          step: totalSteps,
          totalSteps,
          value: state.username,
          prompt: i18n.sentence.hint.account,
        }),
      ]);
      await AccountManager.context.secrets.delete(ACCOUNT_KEY);
    }

    async function inputPassword(input: MultiStepInput) {
      const password = await input.showInputBox({
        title,
        step: totalSteps,
        totalSteps,
        prompt: i18n.sentence.hint.password,
        password: true,
      });
      state.password = createHash("md5").update(password).digest("hex");
      await AccountManager.context.secrets.store(
        ACCOUNT_KEY,
        JSON.stringify(state)
      );
    }
  }

  getSessions(): Promise<ReadonlyArray<AuthenticationSession>> {
    return Promise.resolve(State.login ? AccountManager.sessions : []);
  }

  async createSession(): Promise<AuthenticationSession> {
    try {
      await AccountManager.loginQuickPick();
      if (!(await AccountManager.login())) throw Error();
    } catch {
      throw Error();
    }
    const added = AccountManager.sessions;
    this._onDidChangeSessions.fire({ added });
    return added[0];
  }

  async removeSession(): Promise<void> {
    if (!(await AccountManager.logout())) throw Error();
    this._onDidChangeSessions.fire({ removed: AccountManager.sessions });
    await authentication.getSession(AUTH_PROVIDER_ID, []);
    return;
  }
}
