import {
  ACCOUNT_KEY,
  AUTH_PROVIDER_ID,
  AUTO_CHECK,
  COOKIE_KEY,
} from "../constant";
import type {
  AuthenticationProvider,
  AuthenticationProviderAuthenticationSessionsChangeEvent,
  AuthenticationSession,
  ExtensionContext,
} from "vscode";
import { EventEmitter, authentication, window } from "vscode";
import { IPC, MultiStepInput, State, Webview } from "../util";
import type { InputStep } from "../util";
import type { NeteaseTypings } from "api";
import { createHash } from "crypto";
import i18n from "../i18n";

export class AccountManager implements AuthenticationProvider {
  static uid = 0;

  static nickname = "";

  static context: ExtensionContext;

  static userPlaylist: NeteaseTypings.PlaylistItem[];

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

  _onDidChangeSessions =
    new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();

  readonly onDidChangeSessions = this._onDidChangeSessions.event;

  static async getInstance(): Promise<AccountManager> {
    try {
      if ((await this.login()) && AUTO_CHECK)
        void IPC.netease("dailyCheck", []);
    } catch (err) {
      console.error(err);
    }
    return this.instance || (this.instance = new AccountManager());
  }

  static isUserPlaylisr(id: number): boolean {
    return this.userPlaylist.findIndex(({ id: vid }) => vid === id) !== -1;
  }

  static async playlist(): Promise<NeteaseTypings.PlaylistItem[]> {
    if (this.uid === 0) return [];
    const lists = await IPC.netease("userPlaylist", [this.uid]);
    this.userPlaylist = lists.filter(
      ({ creator: { userId } }) => userId === this.uid
    );
    return lists;
  }

  static async djradio(): Promise<NeteaseTypings.RadioDetail[]> {
    if (this.uid === 0) return [];
    return await IPC.netease("djSublist", []);
  }

  private static async logout(): Promise<boolean> {
    if (!(await IPC.netease("logout", []))) return false;

    IPC.logout();
    void this.context.secrets.delete(ACCOUNT_KEY);
    void this.context.secrets.delete(COOKIE_KEY);

    return true;
  }

  private static async login(): Promise<boolean> {
    if (State.login) return true;

    let account: NeteaseTypings.Account | undefined = undefined;
    try {
      const accountStr = await this.context.secrets.get(ACCOUNT_KEY);
      if (accountStr)
        account = JSON.parse(accountStr) as NeteaseTypings.Account;
    } catch (err) {
      console.error(err);
    }

    let cookieStr: string | undefined = undefined;
    if (!account) {
      try {
        cookieStr = await this.context.secrets.get(COOKIE_KEY);
      } catch (err) {
        console.error(err);
      }
    }

    const res = account
      ? account.phone.length > 0
        ? await IPC.netease("loginCellphone", [
            account.phone,
            account.countrycode,
            account.password,
          ])
        : await IPC.netease("login", [account.username, account.password])
      : await IPC.netease("loginStatus", [cookieStr]);

    void this.context.secrets.delete(ACCOUNT_KEY);

    if (!res) {
      void window.showErrorMessage(i18n.sentence.fail.signIn);
      void this.context.secrets.delete(COOKIE_KEY);
      return false;
    }

    IPC.login(res);
    const { userId, nickname } = res;
    this.uid = userId;
    this.nickname = nickname;
    State.login = true;

    return true;
  }

  private static async loginQuickPick(): Promise<void> {
    if (State.login) return;

    const title = i18n.word.signIn;
    let totalSteps = 3;
    const state: NeteaseTypings.Account = {
      phone: "",
      username: "",
      password: "",
      countrycode: "86",
    };

    const enum Type {
      emial,
      phone,
      qrcode,
      // cookie,
    }

    await MultiStepInput.run(async (input) => {
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
          /* {
            label: "$(database) Cookie",
            type: Type.cookie,
          }, */
        ],
        placeholder: i18n.sentence.hint.signIn,
      });
      switch (pick.type) {
        case Type.phone:
          totalSteps = 4;
          return (input) => inputCountrycode(input);
        case Type.emial:
          totalSteps = 3;
          return (input) => inputUsername(input);
        /* case Type.cookie:
          totalSteps = 2;
          return (input) => inputCookie(input); */
        case Type.qrcode:
          await Webview.login();
          await AccountManager.context.secrets.delete(ACCOUNT_KEY);
      }
      return;
    });

    async function inputCountrycode(input: MultiStepInput): Promise<InputStep> {
      state.countrycode = await input.showInputBox({
        title,
        step: 2,
        totalSteps,
        value: state.countrycode,
        prompt: i18n.sentence.hint.countrycode,
      });
      return (input) => inputPhone(input);
    }

    async function inputPhone(input: MultiStepInput): Promise<InputStep> {
      state.phone = await input.showInputBox({
        title,
        step: totalSteps - 1,
        totalSteps,
        value: state.phone,
        prompt: i18n.sentence.hint.account,
      });
      state.username = "";
      return (input) => inputPassword(input);
    }

    async function inputUsername(input: MultiStepInput): Promise<InputStep> {
      state.username = await input.showInputBox({
        title,
        step: totalSteps - 1,
        totalSteps,
        value: state.username,
        prompt: i18n.sentence.hint.account,
      });
      state.phone = "";
      return (input) => inputPassword(input);
    }

    /* async function inputCookie(input: MultiStepInput) {
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
    } */

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
