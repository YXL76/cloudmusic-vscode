import * as crypto from "crypto";
import {
  ACCOUNT_FILE,
  AUTO_CHECK,
  CACHE_DIR,
  MEDIA_CONTROL,
  MUSIC_QUALITY,
  NATIVE,
  PLAYER_AVAILABLE,
  PlaylistItem,
  SETTING_DIR,
  TMP_DIR,
} from "./constant";
import { AccountManager, ButtonManager } from "./manager";
import { ExtensionContext, QuickPickItem, commands, window } from "vscode";
import { IsLike, LoggedIn, PersonalFm, lock } from "./state";
import {
  LyricCache,
  MultiStepInput,
  MusicCache,
  SearchType,
  apiFmTrash,
  apiLike,
  apiPlaylistTracks,
  apiPlaymodeIntelligenceList,
  apiSearchAlbum,
  apiSearchArtist,
  apiSearchHotDetail,
  apiSearchPlaylist,
  apiSearchSingle,
  apiSearchSuggest,
  load,
  lyric,
  pickAlbum,
  pickAlbumItems,
  pickArtist,
  pickArtistItems,
  pickPlaylist,
  pickPlaylistItems,
  pickSong,
  pickSongItems,
  player,
  songsItem2TreeItem,
  stop,
} from "./util";
import {
  PlaylistItemTreeItem,
  PlaylistProvider,
  QueueItemTreeItem,
  QueueProvider,
} from "./provider";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlink,
  writeFile,
} from "fs";
import { WebView } from "./page";
import { i18n } from "./i18n";
import { join } from "path";
import { throttle } from "lodash";
import del = require("del");

export function activate(context: ExtensionContext): void {
  // init player
  if (!PLAYER_AVAILABLE) {
    lock.playerLoad.set(true);
    window.showErrorMessage(i18n.sentence.error.systemSupport);
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
    QueueProvider.refresh(async (queueProvider) => {
      if (!PersonalFm.get()) {
        stop();
      }
      queueProvider.clear();
    });
  });
  commands.registerCommand("cloudmusic.randomQueue", () => {
    QueueProvider.refresh(async (queueProvider) => {
      queueProvider.random();
    });
  });
  commands.registerCommand(
    "cloudmusic.playSong",
    async (element: QueueItemTreeItem) => {
      if (!lock.playerLoad.get()) {
        PersonalFm.set(false);
        await load(element);
        QueueProvider.refresh(async (queueProvider) => {
          queueProvider.top(element);
        });
      }
    }
  );
  commands.registerCommand(
    "cloudmusic.deleteSong",
    (element: QueueItemTreeItem) => {
      QueueProvider.refresh(async (queueProvider) => {
        queueProvider.delete(element);
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

    const title = i18n.word.signIn;
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
      window.showInformationMessage(i18n.sentence.success.signIn);
    } else {
      window.showErrorMessage(i18n.sentence.fail.signIn);
    }

    async function pickMethod(input: MultiStepInput) {
      const pick = await input.showQuickPick({
        title,
        step: 1,
        totalSteps,
        items: [
          {
            label: `✉ ${i18n.word.email}`,
            description: i18n.sentence.label.email,
            phone: false,
          },
          {
            label: `📱 ${i18n.word.cellphone}`,
            description: i18n.sentence.label.cellphone,
            phone: true,
          },
        ],
        placeholder: i18n.sentence.hint.signIn,
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
        prompt: i18n.sentence.hint.account,
      });
      return (input: MultiStepInput) => inputPassword(input);
    }

    async function inputPassword(input: MultiStepInput) {
      const password = await input.showInputBox({
        title,
        step: 3,
        totalSteps,
        prompt: i18n.sentence.hint.password,
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
        description: i18n.word.user,
        type: 0,
      },
      {
        label: i18n.word.personalFm,
        type: 1,
      },
      {
        label: i18n.word.userRankingList,
        description: i18n.word.weekly,
        id: "userMusicRankingWeekly",
        queryType: 1,
        type: 2,
      },
      {
        label: i18n.word.userRankingList,
        description: i18n.word.allTime,
        id: "userMusicRankingAllTime",
        queryType: 0,
        type: 2,
      },
      {
        label: i18n.word.signOut,
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
    if (!lock.playerLoad.get() && len > 0) {
      QueueProvider.refresh(async (queueProvider) => {
        await load(queueProvider.songs[len]);
        queueProvider.shift(-1);
      });
    }
  });

  // next command
  const next = commands.registerCommand("cloudmusic.next", async () => {
    if (lock.playerLoad.get()) {
      return;
    }
    if (PersonalFm.get()) {
      load(await PersonalFm.next());
    } else if (queueProvider.songs.length > 1) {
      QueueProvider.refresh(async (queueProvider) => {
        await load(queueProvider.songs[1]);
        queueProvider.shift(1);
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
    const { id } = player.item;
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
      placeHolder: `${i18n.sentence.hint.volume} (0~100)`,
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
    const hotItems = (await apiSearchHotDetail()).map(
      ({ searchWord, content }) => ({
        label: searchWord,
        detail: content,
      })
    );

    const title = i18n.word.search;
    const totalSteps = 3;
    const limit = 30;

    type State = {
      keyword: string;
      type: SearchType;
    };

    const updateSuggestions = throttle((that, value) => {
      that.enabled = false;
      that.busy = true;
      apiSearchSuggest(value).then((suggestions) => {
        that.items = [that.items[0]].concat(
          suggestions.map((label) => ({ label }))
        );
        that.enabled = true;
        that.busy = false;
      });
    }, 256);

    const state = {} as State;
    await MultiStepInput.run((input) => inputKeyword(input));

    async function inputKeyword(input: MultiStepInput) {
      const pick = await input.showQuickPick({
        title,
        step: 1,
        totalSteps,
        items: state.keyword
          ? [{ label: state.keyword }].concat(hotItems)
          : hotItems,
        placeholder: i18n.sentence.hint.keyword,
        changeCallback: (that, value) => {
          if (value) {
            that.items = [{ label: value }].concat(that.items.slice(1));
            updateSuggestions(that, value);
          } else {
            that.items = hotItems;
          }
        },
      });
      state.keyword = pick.label;
      return (input: MultiStepInput) => pickType(input);
    }

    async function pickType(input: MultiStepInput) {
      const pick = await input.showQuickPick({
        title,
        step: 2,
        totalSteps,
        items: [
          {
            label: `$(link) ${i18n.word.single}`,
            type: SearchType.single,
          },
          {
            label: `$(circuit-board) ${i18n.word.album}`,
            type: SearchType.album,
          },
          {
            label: `$(account) ${i18n.word.artist}`,
            type: SearchType.artist,
          },
          {
            label: `$(list-unordered) ${i18n.word.playlist}`,
            type: SearchType.playlist,
          },
        ],
        placeholder: i18n.sentence.hint.search,
      });
      state.type = pick.type;
      if (state.type === SearchType.single) {
        return (input: MultiStepInput) => pickSearchSingle(input, 0);
      }
      if (state.type === SearchType.album) {
        return (input: MultiStepInput) => pickSearchAlbum(input, 0);
      }
      if (state.type === SearchType.artist) {
        return (input: MultiStepInput) => pickSearchArtist(input, 0);
      }
      if (state.type === SearchType.playlist) {
        return (input: MultiStepInput) => pickSearchPlaylist(input, 0);
      }
      return (input: MultiStepInput) => pickSearchSingle(input, 0);
    }

    async function pickSearchSingle(input: MultiStepInput, offset: number) {
      const songs = await apiSearchSingle(state.keyword, limit, offset);
      const pick = await input.showQuickPick({
        title,
        step: 3,
        totalSteps,
        items: [
          ...(offset > 0
            ? [{ label: `$(arrow-up) ${i18n.word.previousPage}`, id: -1 }]
            : []),
          ...pickSongItems(songs),
          ...(songs.length === limit
            ? [{ label: `$(arrow-down) ${i18n.word.nextPage}`, id: -2 }]
            : []),
        ],
      });
      if (pick.id === -1) {
        input.pop();
        return (input: MultiStepInput) =>
          pickSearchSingle(input, offset - limit);
      }
      if (pick.id === -2) {
        input.pop();
        return (input: MultiStepInput) =>
          pickSearchSingle(input, offset + limit);
      }
      return (input: MultiStepInput) => pickSong(input, 4, pick.id);
    }

    async function pickSearchAlbum(input: MultiStepInput, offset: number) {
      const albums = await apiSearchAlbum(state.keyword, limit, offset);
      const pick = await input.showQuickPick({
        title,
        step: 3,
        totalSteps,
        items: [
          ...(offset > 0
            ? [{ label: `$(arrow-up) ${i18n.word.previousPage}`, id: -1 }]
            : []),
          ...pickAlbumItems(albums),
          ...(albums.length === limit
            ? [{ label: `$(arrow-down) ${i18n.word.nextPage}`, id: -2 }]
            : []),
        ],
      });
      if (pick.id === -1) {
        input.pop();
        return (input: MultiStepInput) =>
          pickSearchAlbum(input, offset - limit);
      }
      if (pick.id === -2) {
        input.pop();
        return (input: MultiStepInput) =>
          pickSearchAlbum(input, offset + limit);
      }
      return (input: MultiStepInput) => pickAlbum(input, 4, pick.id);
    }

    async function pickSearchArtist(input: MultiStepInput, offset: number) {
      const artists = await apiSearchArtist(state.keyword, limit, offset);
      const pick = await input.showQuickPick({
        title,
        step: 3,
        totalSteps,
        items: [
          ...(offset > 0
            ? [{ label: `$(arrow-up) ${i18n.word.previousPage}`, id: -1 }]
            : []),
          ...pickArtistItems(artists),
          ...(artists.length === limit
            ? [{ label: `$(arrow-down) ${i18n.word.nextPage}`, id: -2 }]
            : []),
        ],
      });
      if (pick.id === -1) {
        input.pop();
        return (input: MultiStepInput) =>
          pickSearchArtist(input, offset - limit);
      }
      if (pick.id === -2) {
        input.pop();
        return (input: MultiStepInput) =>
          pickSearchArtist(input, offset + limit);
      }
      return (input: MultiStepInput) => pickArtist(input, 4, pick.id);
    }

    async function pickSearchPlaylist(input: MultiStepInput, offset: number) {
      const playlists = await apiSearchPlaylist(state.keyword, limit, offset);
      const pick = await input.showQuickPick({
        title,
        step: 4,
        totalSteps,
        items: [
          ...(offset > 0
            ? [
                {
                  label: `$(arrow-up) ${i18n.word.previousPage}`,
                  id: -1,
                  item: {},
                },
              ]
            : []),
          ...pickPlaylistItems(playlists),
          ...(playlists.length === limit
            ? [
                {
                  label: `$(arrow-down) ${i18n.word.nextPage}`,
                  id: -2,
                  item: {},
                },
              ]
            : []),
        ],
      });
      if (pick.id === -1) {
        input.pop();
        return (input: MultiStepInput) =>
          pickSearchPlaylist(input, offset - limit);
      }
      if (pick.id === -2) {
        input.pop();
        return (input: MultiStepInput) =>
          pickSearchPlaylist(input, offset + limit);
      }
      return (input: MultiStepInput) =>
        pickPlaylist(input, 4, pick.item as PlaylistItem);
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
    (element: PlaylistItemTreeItem) => {
      PlaylistProvider.playPlaylist(element.item.id, () => {
        PersonalFm.set(false);
        if (!lock.playerLoad.get()) {
          load(queueProvider.songs[0]);
        }
      });
    }
  );
  commands.registerCommand(
    "cloudmusic.addPlaylist",
    (element: PlaylistItemTreeItem) => {
      PlaylistProvider.addPlaylist(element);
    }
  );
  commands.registerCommand(
    "cloudmusic.intelligence",
    async (element: QueueItemTreeItem) => {
      PersonalFm.set(false);
      QueueProvider.refresh(async (queueProvider) => {
        const { pid } = element;
        const { id } = element.item;
        const songs = await apiPlaymodeIntelligenceList(id, pid);
        const ids = songs.map((song) => song.id);
        const elements = await songsItem2TreeItem(id, ids, songs);
        queueProvider.clear();
        queueProvider.add([element]);
        queueProvider.add(elements);
        if (!lock.playerLoad.get()) {
          load(element);
        }
      });
    }
  );
  commands.registerCommand(
    "cloudmusic.addSong",
    (element: QueueItemTreeItem) => {
      QueueProvider.refresh(async (queueProvider) => {
        queueProvider.add([element]);
      });
    }
  );
  commands.registerCommand(
    "cloudmusic.playSongWithPlaylist",
    (element: QueueItemTreeItem) => {
      PlaylistProvider.playPlaylist(
        element.pid,
        () => {
          if (!lock.playerLoad.get()) {
            load(element);
          }
        },
        element
      );
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
      const id = element ? element.item.id : player.item.id;
      if (id) {
        await MultiStepInput.run((input) => pickSong(input, 1, id));
      }
    }
  );
  commands.registerCommand("cloudmusic.lyric", async () => {
    const pick = await window.showQuickPick([
      {
        label: i18n.word.lyricDelay,
        description: `${i18n.sentence.label.lyricDelay} (${i18n.word.default}: -1.0)`,
        type: 0,
      },
      {
        label: i18n.word.fullLyric,
        type: 1,
      },
      {
        label: i18n.word.cleanCache,
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
          placeHolder: i18n.sentence.hint.lyricDelay,
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
    apiFmTrash(player.item.id);
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
