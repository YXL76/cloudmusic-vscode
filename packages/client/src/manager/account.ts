import { ACCOUNT_KEY, AUTO_CHECK, COOKIE_KEY } from "../constant/index.js";
import {
  ButtonAction,
  CONTEXT,
  IPC,
  MultiStepInput,
  STATE,
  Webview,
  inputKeyword,
  pickAlbums,
  pickArtist,
  pickArtistItems,
  pickArtists,
  pickPlaylist,
  pickPlaylistItems,
  pickPlaylists,
  pickPrograms,
  pickRadios,
  pickSongs,
  pickUser,
} from "../utils/index.js";
import { NeteaseArtistArea, NeteaseArtistType, NeteaseTopSongType } from "@cloudmusic/shared";
import { commands, window } from "vscode";
import type { InputStep } from "../utils/index.js";
import type { NeteaseTypings } from "api";
import type { QuickPickItem } from "vscode";
import { createHash } from "node:crypto";
import i18n from "../i18n/index.js";

type CookieState = { uid: number; cookie: string }[];
type States = Record<number, NeteaseTypings.Account>;

async function getCookies() {
  try {
    const cookieStr = (await CONTEXT.context.secrets.get(COOKIE_KEY)) ?? "[]";
    return <CookieState>JSON.parse(cookieStr);
  } catch (err) {
    console.error(err);
  }
  return [];
}

async function getStates() {
  try {
    const statesStr = (await CONTEXT.context.secrets.get(ACCOUNT_KEY)) ?? "{}";
    return <States>JSON.parse(statesStr);
  } catch (err) {
    console.error(err);
  }
  return {};
}

export class AccountManager {
  static readonly accounts = new Map<number, NeteaseTypings.Profile>();

  static async init(): Promise<void> {
    if (STATE.master) await this.masterInit();
    IPC.neteaseAc();
  }

  static async masterInit(): Promise<void> {
    const cookies = await getCookies();

    if (!cookies.length) {
      void window.showInformationMessage(i18n.sentence.hint.trySignIn, i18n.word.signIn).then((action) => {
        if (action === i18n.word.signIn) void commands.executeCommand("cloudmusic.addAccount");
      });
      return;
    }

    const states = await getStates();

    for (const { uid, cookie } of cookies) {
      const newCookie = uid in states ? await IPC.netease("loginRefresh", [cookie]) : undefined; // Use password

      if (await IPC.netease("loginStatus", [newCookie ?? cookie])) {
        if (AUTO_CHECK) void IPC.netease("dailyCheck", [uid]);
        continue;
      }

      if (!(uid in states)) continue;
      // Use password to login again
      const { phone, username, password, captcha, countrycode } = states[uid];
      const res = await (phone.length
        ? IPC.netease("loginCellphone", [phone, countrycode, password, captcha])
        : IPC.netease("login", [username, password]));

      if (!res) delete states[uid];
    }

    await CONTEXT.context.secrets.store(ACCOUNT_KEY, JSON.stringify(states));
  }

  static async dailyCheck(): Promise<boolean> {
    const res = await Promise.allSettled([...this.accounts].map(([uid]) => IPC.netease("dailyCheck", [uid])));
    return !!res.find((v) => v.status === "fulfilled" && v.value);
  }

  static async isUserPlaylisr(uid: number, id: number): Promise<boolean> {
    return (await this.userPlaylist(uid)).findIndex(({ id: vid }) => vid === id) !== -1;
  }

  static async userPlaylist(uid: number): Promise<readonly NeteaseTypings.PlaylistItem[]> {
    return (await this.playlist(uid)).filter(({ creator: { userId } }) => userId === uid);
  }

  static playlist(uid: number): Promise<readonly NeteaseTypings.PlaylistItem[]> {
    return IPC.netease("userPlaylist", [uid]);
  }

  static djradio(uid: number): Promise<readonly NeteaseTypings.RadioDetail[]> {
    return IPC.netease("djSublist", [uid]);
  }

  static async login(state: NeteaseTypings.Account) {
    const res = await (state.phone.length
      ? IPC.netease("loginCellphone", [state.phone, state.countrycode, state.password, state.captcha])
      : IPC.netease("login", [state.username, state.password]));

    if (!res) {
      void window.showErrorMessage(i18n.sentence.fail.signIn);
      return false;
    } else {
      const states = await getStates();
      states[res.userId] = state;
      await CONTEXT.context.secrets.store(ACCOUNT_KEY, JSON.stringify(states));
      return true;
    }
  }

  static async logout(uid: number): Promise<boolean> {
    const states = await getStates();
    delete states[uid];
    await CONTEXT.context.secrets.store(ACCOUNT_KEY, JSON.stringify(states));

    if (!(await IPC.netease("logout", [uid]))) return false;
    IPC.neteaseAc();
    return true;
  }

  static async loginQuickPick(): Promise<void> {
    const title = i18n.word.signIn;
    let captcha = false;
    let totalSteps = 3;
    const state: NeteaseTypings.Account = { phone: "", username: "", password: "", captcha: "", countrycode: "86" };

    const enum Type {
      email,
      phone,
      captcha,
      qrcode,
    }

    await MultiStepInput.run(async (input) => {
      const pick = await input.showQuickPick({
        title,
        step: 1,
        totalSteps,
        items: [
          { label: `$(mail) ${i18n.word.email}`, description: i18n.sentence.label.email, type: Type.email },
          {
            label: `$(device-mobile) ${i18n.word.cellphone}`,
            description: i18n.sentence.label.cellphone,
            type: Type.phone,
          },
          { label: `$(code) ${i18n.word.captcha}`, description: i18n.sentence.label.captcha, type: Type.captcha },
          { label: `$(diff) ${i18n.word.qrcode}`, description: i18n.sentence.label.qrcode, type: Type.qrcode },
        ],
        placeholder: i18n.sentence.hint.signIn,
      });

      state.captcha = "";

      switch (pick.type) {
        case Type.phone:
          void window.showWarningMessage(i18n.sentence.warn.login);
          captcha = false;
          totalSteps = 4;
          return (input) => inputCountrycode(input);
        case Type.email:
          void window.showWarningMessage(i18n.sentence.warn.login);
          totalSteps = 3;
          return (input) => inputUsername(input);
        case Type.captcha:
          void window.showWarningMessage(i18n.sentence.warn.login);
          captcha = true;
          totalSteps = 4;
          return (input) => inputCountrycode(input);
        case Type.qrcode:
          void Webview.login();
      }
      return;
    });

    async function inputCountrycode(input: MultiStepInput): Promise<InputStep> {
      const list = await IPC.netease("countriesCodeList", []);
      const { label } = await input.showQuickPick({
        title,
        step: 2,
        totalSteps,
        items: list.map(({ zh, en, code }) => ({ label: code, description: `${zh} (${en})` })),
        placeholder: i18n.sentence.hint.countrycode,
      });
      state.countrycode = label;
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
      return captcha ? (input) => inputCaptcha(input) : (input) => inputPassword(input);
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

    async function inputPassword(input: MultiStepInput) {
      const password = await input.showInputBox({
        title,
        step: totalSteps,
        totalSteps,
        prompt: i18n.sentence.hint.password,
        password: true,
      });
      state.password = createHash("md5").update(password).digest("hex");
      if (await AccountManager.login(state)) void window.showInformationMessage(i18n.sentence.success.signIn);
    }

    async function inputCaptcha(input: MultiStepInput) {
      await IPC.netease("captchaSent", [state.countrycode, state.phone]);
      state.captcha = await input.showInputBox({
        title,
        step: totalSteps,
        totalSteps,
        prompt: i18n.sentence.hint.captcha,
      });
      if (await AccountManager.login(state)) void window.showInformationMessage(i18n.sentence.success.signIn);
    }
  }

  static accountQuickPick(uid: number): void {
    let cat = "";
    let type: NeteaseArtistType;
    let area: NeteaseArtistArea;
    let initial: NeteaseTypings.ArtistInitial;
    void MultiStepInput.run((input) => pickType(input));

    async function pickType(input: MultiStepInput): Promise<InputStep | void> {
      const enum Type {
        user,
        level,
        fm,
        search,
        recommendation,
        toplist,
        explore,
        musicRanking,
        save,
        signOut,
      }

      const level = await IPC.netease("userLevel", [uid]);

      const pick = await input.showQuickPick({
        title: i18n.word.account,
        step: 1,
        totalSteps: 1,
        items: [
          { label: `$(account) ${AccountManager.accounts.get(uid)?.nickname ?? ""}`, type: Type.user },
          {
            label: `$(graph) Lv.${level.level}`,
            description: `${Math.floor(level.progress * 100)}%`,
            type: Type.level,
          },
          { label: `$(radio-tower) ${i18n.word.personalFm}`, type: Type.fm },
          { label: `$(search) ${i18n.word.search}`, type: Type.search },
          { label: `$(symbol-color) ${i18n.word.recommendation}`, type: Type.recommendation },
          { label: `$(rocket) ${i18n.word.toplist}`, type: Type.toplist },
          { label: `$(telescope) ${i18n.word.explore}`, type: Type.explore },
          { label: `$(list-ordered) ${i18n.word.musicRanking}`, type: Type.musicRanking },
          { label: `$(diff-added) ${i18n.word.saved}`, type: Type.save },
          { label: `$(sign-out) ${i18n.word.signOut}`, type: Type.signOut },
        ],
      });

      switch (pick.type) {
        case Type.user:
          return (input) => pickUser(input, 2, uid);
        case Type.search:
          return (input) => inputKeyword(input, uid);
        case Type.recommendation:
          return (input) => pickRecommend(input);
        case Type.toplist:
          return (input) => pickToplist(input);
        case Type.explore:
          return (input) => pickExplore(input);
        case Type.save:
          return (input) => pickSave(input);
        case Type.fm:
          IPC.fm(uid);
          break;
        case Type.musicRanking:
          await Webview.musicRanking(uid);
          break;
        case Type.signOut:
          if (await AccountManager.logout(uid)) return;
      }
      return input.stay();
    }

    async function pickRecommend(input: MultiStepInput): Promise<InputStep> {
      const enum Type {
        dailyPlaylist,
        dailySong,
        playlist,
        song,
        radio,
        program,
      }

      const pick = await input.showQuickPick({
        title: i18n.word.recommendation,
        step: 2,
        totalSteps: 3,
        items: [
          { label: `$(list-unordered) ${i18n.sentence.label.dailyRecommendedPlaylists}`, type: Type.dailyPlaylist },
          { label: `$(zap) ${i18n.sentence.label.dailyRecommendedSongs}`, type: Type.dailySong },
          { label: `$(list-unordered) ${i18n.sentence.label.playlistRecommendation}`, type: Type.playlist },
          { label: `$(zap) ${i18n.sentence.label.newsongRecommendation}`, type: Type.song },
          { label: `$(rss) ${i18n.sentence.label.radioRecommendation}`, type: Type.radio },
          { label: `$(radio-tower) ${i18n.sentence.label.programRecommendation}`, type: Type.program },
        ],
      });
      switch (pick.type) {
        case Type.dailyPlaylist:
          return async (input) => pickPlaylists(input, 3, await IPC.netease("recommendResource", [uid]));
        case Type.dailySong:
          return async (input) => pickSongs(input, 3, await IPC.netease("recommendSongs", [uid]));
        case Type.playlist:
          return async (input) => pickPlaylists(input, 3, await IPC.netease("personalized", [uid]));
        case Type.song:
          return async (input) => pickSongs(input, 3, await IPC.netease("personalizedNewsong", [uid]));
        case Type.radio:
          return async (input) =>
            pickRadioType(
              input,
              3,
              () => IPC.netease("djRecommend", [uid]),
              (cateId) => IPC.netease("djRecommendType", [uid, cateId]),
            );
        case Type.program:
          return async (input) => pickPrograms(input, 3, await IPC.netease("personalizedDjprogram", [uid]));
      }
    }

    async function pickRadioType(
      input: MultiStepInput,
      step: number,
      allFunc: (...args: readonly number[]) => Promise<readonly NeteaseTypings.RadioDetail[]>,
      typeFunc: (id: number, ...args: readonly number[]) => Promise<readonly NeteaseTypings.RadioDetail[]>,
    ): Promise<InputStep> {
      const types = await IPC.netease("djCatelist", []);
      const pick = await input.showQuickPick({
        title: i18n.word.type,
        step,
        totalSteps: step + 1,
        items: [{ label: i18n.word.all, id: -1 }, ...types.map(({ name, id }) => ({ label: name, id }))],
      });
      if (pick.id === -1) return async (input) => pickRadios(input, 3, await allFunc(100, 0));
      return async (input) => pickRadios(input, 3, await typeFunc(pick.id, 100, 0));
    }

    async function pickToplist(input: MultiStepInput): Promise<InputStep> {
      const enum Type {
        song,
        artist,
        radioNew,
        radioHot,
        program,
        program24,
      }

      const pick = await input.showQuickPick({
        title: i18n.word.toplist,
        step: 2,
        totalSteps: 3,
        items: [
          { label: `$(zap) ${i18n.word.songList}`, type: Type.song },
          { label: `$(account) ${i18n.word.artistList}`, type: Type.artist },
          { label: `$(rss) ${i18n.word.radio} (${i18n.word.new})`, type: Type.radioNew },
          { label: `$(rss) ${i18n.word.radio} (${i18n.word.hot})`, type: Type.radioHot },
          { label: `$(radio-tower) ${i18n.word.program}`, type: Type.program },
          { label: `$(radio-tower) ${i18n.word.program} (${i18n.word.today})`, type: Type.program24 },
        ],
      });
      switch (pick.type) {
        case Type.song:
          return async (input) => pickPlaylists(input, 3, await IPC.netease("toplist", []));
        case Type.artist:
          return async (input) => pickArtists(input, 3, await IPC.netease("toplistArtist", []));
        case Type.radioNew:
          return async (input) => pickRadios(input, 3, await IPC.netease("djToplist", [0, 100, 0]));
        case Type.radioHot:
          return async (input) => pickRadios(input, 3, await IPC.netease("djToplist", [1, 100, 0]));
        case Type.program:
          return async (input) => pickPrograms(input, 3, await IPC.netease("djProgramToplist", [100, 0]));
        case Type.program24:
          return async (input) => pickPrograms(input, 3, await IPC.netease("djProgramToplistHours", []));
      }
    }

    async function pickExplore(input: MultiStepInput): Promise<InputStep> {
      const enum Type {
        playlist,
        highqualityPlaylist,
        artist,
        topAlbums,
        topArtists,
        topSongs,
        albumNewest,
        radioHot,
      }
      const pick = await input.showQuickPick({
        title: i18n.word.explore,
        step: 2,
        totalSteps: 3,
        items: [
          { label: `$(list-unordered) ${i18n.word.playlist}`, type: Type.playlist },
          { label: `$(list-unordered) ${i18n.word.highqualityPlaylist}`, type: Type.highqualityPlaylist },
          { label: `$(account) ${i18n.word.artist}`, type: Type.artist },
          { label: `$(circuit-board) ${i18n.word.topAlbums}`, type: Type.topAlbums },
          { label: `$(account) ${i18n.word.topArtists}`, type: Type.topArtists },
          { label: `$(zap) ${i18n.word.topSong}`, type: Type.topSongs },
          { label: `$(circuit-board) ${i18n.word.albumNewest}`, type: Type.albumNewest },
          { label: `$(rss) ${i18n.word.radioHot}`, type: Type.radioHot },
        ],
      });
      switch (pick.type) {
        case Type.playlist:
          return (input) => pickPlaylistCategories(input);
        case Type.highqualityPlaylist:
          return (input) => pickHighqualitPlaylistCategories(input);
        case Type.artist:
          return (input) => pickArtistType(input);
        case Type.topAlbums:
          return async (input) => pickAlbums(input, 3, await IPC.netease("topAlbum", []));
        case Type.topArtists:
          return async (input) => pickArtists(input, 3, await IPC.netease("topArtists", [50, 0]));
        case Type.topSongs:
          return (input) => pickTopSongs(input);
        case Type.albumNewest:
          return async (input) => pickAlbums(input, 3, await IPC.netease("albumNewest", []));
        case Type.radioHot:
          return async (input) =>
            pickRadioType(
              input,
              3,
              (limit, offset) => IPC.netease("djHot", [limit, offset]),
              (cateId, limit, offset) => IPC.netease("djRadioHot", [cateId, limit, offset]),
            );
      }
    }

    async function pickTopSongs(input: MultiStepInput): Promise<InputStep> {
      const pick = await input.showQuickPick({
        title: i18n.word.categorie,
        step: 3,
        totalSteps: 4,
        items: [
          { label: i18n.word.all, type: NeteaseTopSongType.all },
          { label: i18n.word.zh, type: NeteaseTopSongType.zh },
          { label: i18n.word.en, type: NeteaseTopSongType.ea },
          { label: i18n.word.ja, type: NeteaseTopSongType.ja },
          { label: i18n.word.kr, type: NeteaseTopSongType.kr },
        ],
      });
      return async (input) => pickSongs(input, 4, await IPC.netease("topSong", [pick.type]));
    }

    async function pickPlaylistCategories(input: MultiStepInput): Promise<InputStep> {
      const categories = await IPC.netease("playlistCatlist", []);
      const pick = await input.showQuickPick({
        title: i18n.word.categorie,
        step: 3,
        totalSteps: 6,
        items: Object.keys(categories).map((label) => ({ label })),
      });
      return (input) =>
        pickPlaylistSubCategories(
          input,
          categories[pick.label].map(({ name, hot }) => ({
            label: name,
            description: hot ? "$(flame)" : undefined,
          })),
        );
    }

    async function pickHighqualitPlaylistCategories(input: MultiStepInput): Promise<InputStep> {
      const categories = await IPC.netease("highqualityTags", []);
      const pick = await input.showQuickPick({
        title: i18n.word.categorie,
        step: 3,
        totalSteps: 5,
        items: categories.map(({ name, hot }) => ({
          label: name,
          description: hot ? "$(flame)" : undefined,
        })),
      });
      cat = pick.label;
      return (input) => pickAllHighqualityPlaylists(input);
    }

    async function pickPlaylistSubCategories(
      input: MultiStepInput,
      items: readonly QuickPickItem[],
    ): Promise<InputStep> {
      const pick = await input.showQuickPick({ title: i18n.word.categorie, step: 4, totalSteps: 6, items });
      cat = pick.label;
      return (input) => pickAllPlaylists(input, 0);
    }

    async function pickAllPlaylists(input: MultiStepInput, offset: number): Promise<InputStep> {
      const limit = 50;
      const playlists = await IPC.netease("topPlaylist", [cat, limit, offset]);
      const pick = await input.showQuickPick({
        title: i18n.word.playlist,
        step: 5,
        totalSteps: 6,
        items: pickPlaylistItems(playlists),
        previous: offset > 0,
        next: playlists.length === limit,
      });
      if (pick === ButtonAction.previous) return input.stay((input) => pickAllPlaylists(input, offset - limit));
      if (pick === ButtonAction.next) return input.stay((input) => pickAllPlaylists(input, offset + limit));
      return (input) => pickPlaylist(input, 6, pick.item);
    }

    async function pickAllHighqualityPlaylists(input: MultiStepInput): Promise<InputStep> {
      const limit = 50;
      const playlists = await IPC.netease("topPlaylistHighquality", [cat, limit]);
      const pick = await input.showQuickPick({
        title: i18n.word.playlist,
        step: 4,
        totalSteps: 5,
        items: pickPlaylistItems(playlists),
      });
      return (input) => pickPlaylist(input, 5, pick.item);
    }

    async function pickArtistType(input: MultiStepInput): Promise<InputStep> {
      const pick = await input.showQuickPick({
        title: i18n.word.type,
        step: 3,
        totalSteps: 7,
        items: [
          { label: i18n.word.male, type: NeteaseArtistType.male },
          { label: i18n.word.female, type: NeteaseArtistType.female },
          { label: i18n.word.band, type: NeteaseArtistType.band },
        ],
      });
      type = pick.type;
      return async (input) => pickArtistArea(input);
    }

    async function pickArtistArea(input: MultiStepInput): Promise<InputStep> {
      const pick = await input.showQuickPick({
        title: i18n.word.area,
        step: 4,
        totalSteps: 7,
        items: [
          { label: i18n.word.all, type: NeteaseArtistArea.all },
          { label: i18n.word.zh, type: NeteaseArtistArea.zh },
          { label: i18n.word.en, type: NeteaseArtistArea.ea },
          { label: i18n.word.ja, type: NeteaseArtistArea.ja },
          { label: i18n.word.kr, type: NeteaseArtistArea.kr },
          { label: i18n.word.other, type: NeteaseArtistArea.other },
        ],
      });
      area = pick.type;
      return async (input) => pickArtistInitial(input);
    }

    async function pickArtistInitial(input: MultiStepInput): Promise<InputStep> {
      const allInitial: readonly NeteaseTypings.ArtistInitial[] = [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
      ];

      const pick = await input.showQuickPick({
        title: i18n.word.initial,
        step: 5,
        totalSteps: 7,
        items: [{ label: i18n.word.all, type: <const>"" }, ...allInitial.map((i) => ({ label: <string>i, type: i }))],
      });
      initial = pick.type;
      return (input) => pickAllArtist(input, 0);
    }

    async function pickAllArtist(input: MultiStepInput, offset: number): Promise<InputStep> {
      const limit = 50;
      const artists = await IPC.netease("artistList", [type, area, initial, limit, offset]);
      const pick = await input.showQuickPick({
        title: i18n.word.artist,
        step: 6,
        totalSteps: 7,
        items: pickArtistItems(artists),
        previous: offset > 0,
        next: artists.length === limit,
      });
      if (pick === ButtonAction.previous) return input.stay((input) => pickAllArtist(input, offset - limit));
      if (pick === ButtonAction.next) return input.stay((input) => pickAllArtist(input, offset + limit));
      return (input) => pickArtist(input, 7, pick.id);
    }

    async function pickSave(input: MultiStepInput): Promise<InputStep> {
      const enum Type {
        album,
        artist,
      }

      const pick = await input.showQuickPick({
        title: i18n.word.explore,
        step: 2,
        totalSteps: 3,
        items: [
          { label: `$(circuit-board) ${i18n.word.album}`, type: Type.album },
          { label: `$(account) ${i18n.word.artist}`, type: Type.artist },
        ],
      });
      switch (pick.type) {
        case Type.album:
          return async (input) => pickAlbums(input, 3, await IPC.netease("albumSublist", []));
        case Type.artist:
          return async (input) => pickArtists(input, 3, await IPC.netease("artistSublist", []));
      }
    }
  }
}
