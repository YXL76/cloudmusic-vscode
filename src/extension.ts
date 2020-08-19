import * as crypto from "crypto";
import * as nls from "vscode-nls";
import {
  ACCOUNT_FILE,
  AUTO_CHECK,
  CACHE_DIR,
  MEDIA_CONTROL,
  MUSIC_QUALITY,
  NATIVE,
  PLAYER_AVAILABLE,
  SETTING_DIR,
  TMP_DIR,
} from "./constant/setting";
import { ExtensionContext, QuickPickItem, commands, window } from "vscode";
import { LyricCache, MusicCache } from "./util/cache";
import {
  PlaylistItemTreeItem,
  PlaylistProvider,
} from "./provider/playlistProvider";
import { QueueItemTreeItem, QueueProvider } from "./provider/queueProvider";
import {
  SearchType,
  apiFmTrash,
  apiLike,
  apiPlaylistTracks,
  apiSearchAlbum,
  apiSearchArtist,
  apiSearchHotDetail,
  apiSearchSingle,
} from "./util/api";
import {
  albumsPick,
  artistsPick,
  load,
  lockQueue,
  songPick,
  songsPick,
  splitLine,
  stop,
} from "./util/util";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlink,
  writeFile,
} from "fs";
import { lyric, player } from "./util/player";
import { AccountManager } from "./manager/accountManager";
import { ButtonManager } from "./manager/buttonManager";
import { IsLike } from "./state/like";
import { LoggedIn } from "./state/login";
import { MultiStepInput } from "./util/multiStepInput";
import { PersonalFm } from "./state/play";
import { WebView } from "./page/page";
import { join } from "path";
import { lock } from "./state/lock";
const del = require("del");

nls.config({
  messageFormat: nls.MessageFormat.bundle,
  bundleFormat: nls.BundleFormat.standalone,
})();

const localize = nls.loadMessageBundle();

export function activate(context: ExtensionContext): void {
  // init player
  if (!PLAYER_AVAILABLE) {
    lock.playerLoad.set(true);
    window.showErrorMessage(
      localize("system.support", "System is not supported")
    );
  } else {
    player.volume(85);
  }

  // read account info from local file
  if (!existsSync(SETTING_DIR)) {
    mkdirSync(SETTING_DIR);
  }
  if (existsSync(ACCOUNT_FILE)) {
    try {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { phone, account, md5_password } = JSON.parse(
        readFileSync(ACCOUNT_FILE, "utf8")
      );
      AccountManager.login(phone, account, md5_password).then((res) => {
        if (res && AUTO_CHECK) {
          AccountManager.dailySignin();
        }
      });
    } catch {}
  }

  // init tmp folder
  if (!existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR);
  }

  // init cache folder
  try {
    readdirSync(CACHE_DIR).forEach((folder) => {
      if (folder !== "music" && folder !== "lyric") {
        const pattern = join(CACHE_DIR, folder);
        del.sync([pattern], { force: true });
      }
    });
  } catch {}
  try {
    const pf = join(CACHE_DIR, "music");
    readdirSync(pf).forEach((folder) => {
      if (folder !== `${MUSIC_QUALITY}`) {
        const pattern = join(pf, folder);
        del.sync([pattern], { force: true });
      }
    });
  } catch {}

  // init queue provider
  const queueProvider = QueueProvider.getInstance();

  window.registerTreeDataProvider("queue", queueProvider);

  commands.registerCommand("cloudmusic.clearQueue", () => {
    lockQueue(async () => {
      if (!PersonalFm.get()) {
        stop();
      }
      queueProvider.clear();
      queueProvider.refresh();
    });
  });
  commands.registerCommand("cloudmusic.randomQueue", () => {
    lockQueue(async () => {
      queueProvider.random();
      queueProvider.refresh();
    });
  });
  commands.registerCommand(
    "cloudmusic.playSong",
    async (element: QueueItemTreeItem) => {
      if (!lock.playerLoad) {
        lockQueue(async () => {
          PersonalFm.set(false);
          await load(element);
          queueProvider.top(element);
          queueProvider.refresh();
        });
      }
    }
  );
  commands.registerCommand(
    "cloudmusic.deleteSong",
    (element: QueueItemTreeItem) => {
      lockQueue(async () => {
        queueProvider.delete(element);
        queueProvider.refresh();
      });
    }
  );

  // init status bar button
  ButtonManager.init();

  // sign in command
  const signin = commands.registerCommand("cloudmusic.signin", async () => {
    if (LoggedIn.get()) {
      return;
    }

    const title = localize("signin", "Sign in");
    const totalSteps = 3;

    type State = {
      phone: boolean;
      account: string;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      md5_password: string;
    };

    const state = {} as State;
    await MultiStepInput.run((input) => pickMethod(input));
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { phone, account, md5_password } = state;
    if (
      md5_password &&
      (await AccountManager.login(phone, account, md5_password))
    ) {
      writeFile(ACCOUNT_FILE, JSON.stringify(state), () => {
        //
      });
      window.showInformationMessage(
        localize("signin.success", "Sign in success")
      );
    } else {
      window.showErrorMessage(localize("signin.fail", "Sign in fail"));
    }

    async function pickMethod(input: MultiStepInput) {
      interface T extends QuickPickItem {
        phone: boolean;
      }

      const pick = await input.showQuickPick<T>({
        title,
        step: 1,
        totalSteps,
        items: [
          {
            label: localize("signin.email.label", "✉Email"),
            description: localize(
              "signin.email.description",
              "use email to sign in"
            ),
            phone: false,
          },
          {
            label: localize("signin.cellphone.label", "📱Cellphone"),
            description: localize(
              "signin.cellphone.description",
              "use cellphone to sign in"
            ),
            phone: true,
          },
        ],
        placeholder: localize(
          "signin.placeHolder",
          "Select the method to sign in."
        ),
      });
      state.phone = pick.phone;
      return (input: MultiStepInput) => inputAccount(input);
    }

    async function inputAccount(input: MultiStepInput) {
      state.account = await input.showInputBox({
        title,
        step: 2,
        totalSteps,
        value: state.account,
        prompt: localize("signin.account", "Please enter your account."),
      });
      return (input: MultiStepInput) => inputPassword(input);
    }

    async function inputPassword(input: MultiStepInput) {
      const password = await input.showInputBox({
        title,
        step: 3,
        totalSteps,
        prompt: localize("signin.password", "Please enter your password."),
        password: true,
      });

      state.md5_password = crypto
        .createHash("md5")
        .update(password)
        .digest("hex");
    }
  });

  // daily sign in command
  const dailyCheck = commands.registerCommand("cloudmusic.dailyCheck", () => {
    AccountManager.dailySignin();
  });

  // sign out command
  const signout = commands.registerCommand("cloudmusic.signout", () => {
    if (!LoggedIn.get()) {
      return;
    }
    AccountManager.logout();
    try {
      unlink(ACCOUNT_FILE, () => {
        //
      });
    } catch {}
    LoggedIn.set(false);
  });

  // init webview
  const webview = new WebView(context.extensionPath);

  // account command
  const account = commands.registerCommand("cloudmusic.account", async () => {
    const pick = await window.showQuickPick([
      {
        label: AccountManager.nickname,
        description: localize("account.user", "current user"),
        type: 0,
      },
      {
        label: localize("personalFM", "Personal FM"),
        type: 1,
      },
      {
        label: localize("account.userRanking", "User music ranking"),
        description: localize("account.userRanking.weekly", "Weekly"),
        id: "userMusicRankingWeekly",
        queryType: 1,
        type: 2,
      },
      {
        label: localize("account.userRanking", "User music ranking"),
        description: localize("account.userRanking.allTime", "All Time"),
        id: "userMusicRankingAllTime",
        queryType: 0,
        type: 2,
      },
      {
        label: localize("signout", "Sign out"),
        type: 3,
      },
    ]);
    if (!pick) {
      return;
    }
    switch (pick.type) {
      case 1:
        commands.executeCommand("cloudmusic.personalFM");
        break;
      case 2:
        webview.userMusicRanking(
          `${pick.id}`,
          `${pick.label} (${pick.description})`,
          // @ts-ignore
          pick.queryType
        );
        break;
      case 3:
        commands.executeCommand("cloudmusic.signout");
        break;
    }
  });

  // previous command
  const previous = commands.registerCommand("cloudmusic.previous", async () => {
    const len = queueProvider.songs.length - 1;
    if (!lock.playerLoad && len > 0) {
      lockQueue(async () => {
        await load(queueProvider.songs[len]);
        queueProvider.shift(-1);
        queueProvider.refresh();
      });
    }
  });

  // next command
  const next = commands.registerCommand("cloudmusic.next", async () => {
    if (lock.playerLoad) {
      return;
    }
    if (PersonalFm.get()) {
      load(await PersonalFm.next());
    } else if (queueProvider.songs.length > 1) {
      lockQueue(async () => {
        await load(queueProvider.songs[1]);
        queueProvider.shift(1);
        queueProvider.refresh();
      });
    }
  });

  // play command
  const play = commands.registerCommand("cloudmusic.play", async () => {
    player.togglePlay();
  });

  // like command
  const like = commands.registerCommand("cloudmusic.like", async () => {
    const islike = !IsLike.get();
    const { id } = player;
    if (await apiLike(id, islike ? "" : "false")) {
      IsLike.set(islike);
      islike
        ? AccountManager.likelist.add(id)
        : AccountManager.likelist.delete(id);
    }
  });

  // volume command
  const volume = commands.registerCommand("cloudmusic.volume", async () => {
    const volume = await window.showInputBox({
      value: `${player.level}`,
      placeHolder: localize(
        "volume.placeHolder",
        "Please enter volume between 0 and 100."
      ),
    });
    if (volume && /^\d+$/.exec(volume)) {
      player.volume(parseInt(volume));
    }
  });

  // toggleButton command
  const toggleButton = commands.registerCommand(
    "cloudmusic.toggleButton",
    () => {
      ButtonManager.toggle();
    }
  );

  // personalFM command
  const personalFM = commands.registerCommand("cloudmusic.personalFM", () => {
    PersonalFm.set(!PersonalFm.get());
  });

  // search command
  const search = commands.registerCommand("cloudmusic.search", async () => {
    const hotItems = await apiSearchHotDetail();

    const title = localize("search", "Search");
    const totalSteps = 5;
    const limit = 30;

    type State = {
      keyword: string;
      type: SearchType;
      id: number;
    };

    const state = {} as State;
    await MultiStepInput.run((input) => pickKeyword(input));

    async function pickKeyword(input: MultiStepInput) {
      const pick = await input.showQuickPick({
        title,
        step: 1,
        totalSteps,
        items: [
          {
            label: `$(keyboard) ${localize("search.keyword", "Input keyword")}`,
            type: 1,
          },
          {
            label: splitLine(localize("search.hot", "HOT SEARCH")),
          },
        ].concat(
          hotItems.map(({ searchWord, content }) => ({
            label: searchWord,
            detail: content,
            type: 2,
          }))
        ),
      });
      if (pick.type === 2) {
        state.keyword = pick.label;
      }
      return (input: MultiStepInput) => inputKeyword(input);
    }

    async function inputKeyword(input: MultiStepInput) {
      state.keyword = await input.showInputBox({
        title,
        step: 2,
        totalSteps,
        value: state.keyword,
        prompt: localize("search.keyword.placeHolder", "Please enter keyword."),
      });
      return (input: MultiStepInput) => pickType(input);
    }

    async function pickType(input: MultiStepInput) {
      const pick = await input.showQuickPick({
        title,
        step: 3,
        totalSteps,
        items: [
          {
            label: `$(link) ${localize("search.type.single", "Single")}`,
            type: SearchType.single,
          },
          {
            label: `$(circuit-board) ${localize("search.type.album", "Album")}`,
            type: SearchType.album,
          },
          {
            label: `$(account) ${localize("search.type.artist", "Artist")}`,
            type: SearchType.artist,
          },
        ],
        placeholder: localize(
          "search.type.placeHolder",
          "Please choose search type."
        ),
      });
      state.type = pick.type;
      if (state.type === SearchType.single) {
        return (input: MultiStepInput) => pickSingle(input, 0);
      }
      if (state.type === SearchType.album) {
        return (input: MultiStepInput) => pickAlbum(input, 0);
      }
      if (state.type === SearchType.artist) {
        return (input: MultiStepInput) => pickArtist(input, 0);
      }
    }

    async function pickSingle(input: MultiStepInput, offset: number) {
      const songs = await apiSearchSingle(state.keyword, limit, offset);
      const pick = await input.showQuickPick({
        title,
        step: 5,
        totalSteps,
        items: [
          ...(offset > 0
            ? [
                {
                  label: `$(arrow-up) ${localize(
                    "page.previous",
                    "previous page"
                  )}`,
                  id: -1,
                },
              ]
            : []),
          ...songs.map(({ name, ar, alia, id }) => ({
            label: `$(link) ${name}`,
            description: ar.map((i) => i.name).join("/"),
            detail: alia.join("/"),
            id,
          })),
          ...(songs.length > 0
            ? [
                {
                  label: `$(arrow-down) ${localize("page.next", "Next page")}`,
                  id: -2,
                },
              ]
            : []),
        ],
        unsave: true,
      });
      if (pick.id === -1) {
        return (input: MultiStepInput) => pickSingle(input, offset - limit);
      }
      if (pick.id === -2) {
        return (input: MultiStepInput) => pickSingle(input, offset + limit);
      }
      state.id = pick.id;
    }

    async function pickAlbum(input: MultiStepInput, offset: number) {
      const albums = await apiSearchAlbum(state.keyword, limit, offset);
      const pick = await input.showQuickPick({
        title,
        step: 5,
        totalSteps,
        items: [
          ...(offset > 0
            ? [
                {
                  label: `$(arrow-up) ${localize(
                    "page.previous",
                    "previous page"
                  )}`,
                  id: -1,
                },
              ]
            : []),
          ...albums.map(({ name, alias, artists, id }) => ({
            label: `$(circuit-board) ${name}`,
            description: alias.join("/"),
            detail: artists.map((artist) => artist.name).join("/"),
            id: id,
          })),
          ...(albums.length > 0
            ? [
                {
                  label: `$(arrow-down) ${localize("page.next", "Next page")}`,
                  id: -2,
                },
              ]
            : []),
        ],
        unsave: true,
      });
      if (pick.id === -1) {
        return (input: MultiStepInput) => pickAlbum(input, offset - limit);
      }
      if (pick.id === -2) {
        return (input: MultiStepInput) => pickAlbum(input, offset + limit);
      }
      state.id = pick.id;
    }

    async function pickArtist(input: MultiStepInput, offset: number) {
      const artists = await apiSearchArtist(state.keyword, limit, offset);
      const pick = await input.showQuickPick({
        title,
        step: 5,
        totalSteps,
        items: [
          ...(offset > 0
            ? [
                {
                  label: `$(arrow-up) ${localize(
                    "page.previous",
                    "previous page"
                  )}`,
                  id: -1,
                },
              ]
            : []),
          ...artists.map(({ name, id, alias, briefDesc }) => ({
            label: `$(account) ${name}`,
            description: alias.join("/"),
            detail: briefDesc,
            id,
          })),
          ...(artists.length > 0
            ? [
                {
                  label: `$(arrow-down) ${localize("page.next", "Next page")}`,
                  id: -2,
                },
              ]
            : []),
        ],
        unsave: true,
      });
      if (pick.id === -1) {
        return (input: MultiStepInput) => pickArtist(input, offset - limit);
      }
      if (pick.id === -2) {
        return (input: MultiStepInput) => pickArtist(input, offset + limit);
      }
      state.id = pick.id;
    }
  });

  context.subscriptions.push(signin);
  context.subscriptions.push(dailyCheck);
  context.subscriptions.push(signout);
  context.subscriptions.push(account);
  context.subscriptions.push(previous);
  context.subscriptions.push(next);
  context.subscriptions.push(play);
  context.subscriptions.push(like);
  context.subscriptions.push(volume);
  context.subscriptions.push(toggleButton);
  context.subscriptions.push(personalFM);
  context.subscriptions.push(search);

  // init playlist provider
  const userPlaylistProvider = PlaylistProvider.getUserInstance();
  const favoritePlaylistProvider = PlaylistProvider.getFavoriteInstance();
  window.registerTreeDataProvider("userPlaylist", userPlaylistProvider);
  window.registerTreeDataProvider("favoritePlaylist", favoritePlaylistProvider);

  commands.registerCommand(
    "cloudmusic.refreshPlaylist",
    PlaylistProvider.refresh,
    2048
  );
  commands.registerCommand(
    "cloudmusic.refreshPlaylistContent",
    (element: PlaylistItemTreeItem) => PlaylistProvider.refresh(element)
  );
  commands.registerCommand(
    "cloudmusic.playPlaylist",
    async (element: PlaylistItemTreeItem) => {
      lockQueue(async () => {
        PersonalFm.set(false);
        await PlaylistProvider.playPlaylist(element.item.id);
        if (!lock.playerLoad) {
          load(queueProvider.songs[0]);
        }
      });
    }
  );
  commands.registerCommand(
    "cloudmusic.addPlaylist",
    (element: PlaylistItemTreeItem) => {
      lockQueue(async () => {
        PlaylistProvider.addPlaylist(element.item.id);
      });
    }
  );
  commands.registerCommand(
    "cloudmusic.intelligence",
    async (element: QueueItemTreeItem) => {
      lockQueue(async () => {
        PersonalFm.set(false);
        await PlaylistProvider.intelligence(element);
        if (!lock.playerLoad) {
          load(element);
        }
      });
    }
  );
  commands.registerCommand(
    "cloudmusic.addSong",
    (element: QueueItemTreeItem) => {
      lockQueue(async () => {
        PlaylistProvider.addSong(element);
      });
    }
  );
  commands.registerCommand(
    "cloudmusic.playSongWithPlaylist",
    async (element: QueueItemTreeItem) => {
      lockQueue(async () => {
        PersonalFm.set(false);
        await PlaylistProvider.playPlaylist(element.pid, element);
        if (!lock.playerLoad) {
          load(element);
        }
      });
    }
  );

  commands.registerCommand(
    "cloudmusic.deleteFromPlaylist",
    async (element: QueueItemTreeItem) => {
      if (await apiPlaylistTracks("del", element.pid, [element.item.id])) {
        PlaylistProvider.refresh();
      }
    }
  );
  commands.registerCommand("cloudmusic.addToPlaylist", async ({ item }) => {
    const lists = await AccountManager.userPlaylist();
    const selection = await window.showQuickPick(
      lists.map(({ name, id }) => ({
        label: name,
        id,
      }))
    );
    if (!selection) {
      return;
    }
    if (await apiPlaylistTracks("add", selection.id, [item.id])) {
      PlaylistProvider.refresh();
    }
  });

  // init cache index
  MusicCache.init();

  commands.registerCommand(
    "cloudmusic.songDetail",
    async (element?: QueueItemTreeItem) => {
      const id = element ? element.item.id : player.id;
      if (id) {
        songPick(id, element?.item);
      }
    }
  );
  commands.registerCommand("cloudmusic.lyric", async () => {
    const pick = await window.showQuickPick([
      {
        label: localize("lyric.delay.label", "Lyric delay"),
        description: localize(
          "lyric.delay.description",
          "Set lyric delay (defult: -1.0)"
        ),
        type: 0,
      },
      {
        label: localize("lyric.full.label", "Show full lyric"),
        type: 1,
      },
      {
        label: localize("lyric.cache.label", "Clear lyric cache"),
        type: 2,
      },
    ]);
    if (!pick) {
      return;
    }
    switch (pick.type) {
      case 0:
        const delay = await window.showInputBox({
          value: `${lyric.delay}`,
          placeHolder: localize(
            "lyric.delay.placeHolder",
            "Please enter lyric delay."
          ),
        });
        if (!delay || !/^-?[0-9]+([.]{1}[0-9]+){0,1}$/.test(delay)) {
          return;
        }
        lyric.delay = parseFloat(delay);
        break;
      case 1:
        const lyricItem: QuickPickItem[] = [];
        for (let i = 0; i < lyric.text.length; ++i) {
          lyricItem.push({
            label: lyric.text[i],
            description: `[${lyric.time[i]}]`,
          });
        }
        const allLyric = await window.showQuickPick(lyricItem);
        if (allLyric) {
          await window.showInputBox({
            value: allLyric.description,
          });
        }
        break;
      case 2:
        LyricCache.clear();
        break;
    }
  });
  commands.registerCommand("cloudmusic.fmTrash", () => {
    apiFmTrash(player.id);
  });

  // keyboard detect
  if (MEDIA_CONTROL) {
    const { startKeyboardEvent } = NATIVE;
    startKeyboardEvent((res) => {
      if (res === "prev") {
        commands.executeCommand("cloudmusic.previous");
      } else if (res === "play") {
        commands.executeCommand("cloudmusic.play");
      } else if (res === "next") {
        commands.executeCommand("cloudmusic.next");
      }
    });
  }
}

export function deactivate(): void {
  player.stop();
  MusicCache.verify();
  LyricCache.verify();
  del.sync([TMP_DIR], { force: true });
}
