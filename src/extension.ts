import * as crypto from "crypto";
import { posix, join } from "path";
import {
  commands,
  ExtensionContext,
  QuickPickItem,
  ViewColumn,
  window,
} from "vscode";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlink,
  writeFile,
} from "fs";
import {
  AUTO_CHECK,
  ACCOUNT_FILE,
  TMP_DIR,
  SETTING_DIR,
  MUSIC_QUALITY,
  PLAYER_AVAILABLE,
} from "./constant/setting";
import { AccountManager } from "./manager/accountManager";
import { ButtonManager } from "./manager/buttonManager";
import {
  PlaylistItemTreeItem,
  PlaylistProvider,
} from "./provider/playlistProvider";
import { QueueProvider, QueueItemTreeItem } from "./provider/queueProvider";
import {
  apiFmTrash,
  apiLike,
  apiPlaylistTracks,
  apiUserRecord,
} from "./util/api";
import { lockQueue, load, stop, songPick } from "./util/util";
import { MusicCache } from "./util/cache";
import { player } from "./util/player";
import { lock } from "./state/lock";
import { lyric, PersonalFm } from "./state/play";
import { IsLike } from "./state/like";
import { LoggedIn } from "./state/login";
import { userMusicRanking } from "./page/page";
const del = require("del");

export function activate(context: ExtensionContext): void {
  // init player
  if (!PLAYER_AVAILABLE) {
    lock.playerLoad = true;
    window.showErrorMessage("System is not supported");
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
      AccountManager.login(phone, account, md5_password).then(() => {
        LoggedIn.set(true);
        if (AUTO_CHECK) {
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
    const pf = join(SETTING_DIR, "cache");
    readdirSync(pf).forEach((folder) => {
      if (folder !== `${MUSIC_QUALITY}`) {
        const pattern = posix.join(pf, folder);
        del.sync([pattern], { force: true });
      }
    });
  } catch {}

  // init queue provider
  const queueProvider = QueueProvider.getInstance();

  window.registerTreeDataProvider("queue", queueProvider);

  commands.registerCommand("cloudmusic.clearQueue", () => {
    lockQueue(async () => {
      stop();
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
    const method = await window.showQuickPick(
      [
        {
          label: "✉Email",
          description: "use email to sign in",
          phone: false,
        },
        {
          label: "📱Cellphone",
          description: "use cellphone to sign in",
          phone: true,
        },
      ],
      {
        placeHolder: "Select the method to sign in.",
      }
    );
    if (!method) {
      return;
    }
    const account = await window.showInputBox({
      placeHolder: "Please enter your account.",
    });
    if (!account) {
      return;
    }
    const password = await window.showInputBox({
      placeHolder: "Please enter your password.",
      password: true,
    });
    if (!password) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const md5_password = crypto
      .createHash("md5")
      .update(password)
      .digest("hex");
    if (await AccountManager.login(method.phone, account, md5_password)) {
      writeFile(
        ACCOUNT_FILE,
        JSON.stringify({
          phone: method.phone,
          account,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          md5_password,
        }),
        () => {
          //
        }
      );
      LoggedIn.set(true);
      window.showInformationMessage("Sign in success");
    } else {
      window.showErrorMessage("Sign in fail");
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
    window.showInformationMessage("Sign out success");
  });

  // account command
  const account = commands.registerCommand("cloudmusic.account", async () => {
    const pick = await window.showQuickPick([
      {
        label: AccountManager.nickname,
        description: "current user",
        type: 0,
      },
      {
        label: "Personal FM",
        type: 1,
      },
      {
        label: "User music ranking",
        description: "Weekly",
        id: "userMusicRankingWeekly",
        queryType: 1,
        type: 2,
      },
      {
        label: "User music ranking",
        description: "All Time",
        id: "userMusicRankingAllTime",
        queryType: 0,
        type: 2,
      },
      {
        label: "Sign out",
        type: 3,
      },
    ]);
    if (!pick) {
      return;
    }
    switch (pick.type) {
      case 1:
        PersonalFm.set(!PersonalFm.get());
        break;
      case 2:
        const userMusicRankingWeekly = window.createWebviewPanel(
          `${pick.id}`,
          `${pick.label} (${pick.description})`,
          ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
          }
        );
        userMusicRankingWeekly.webview.html = userMusicRanking(
          context,
          userMusicRankingWeekly,
          // @ts-ignore
          await apiUserRecord(pick.queryType)
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
      placeHolder: "Please enter volume between 0 and 100.",
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
      lists.map((list) => {
        return {
          label: list.name,
          id: list.id,
        };
      })
    );
    if (!selection) {
      return;
    }
    if (await apiPlaylistTracks("add", selection.id, item.id)) {
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
        songPick(id);
      }
    }
  );
  commands.registerCommand("cloudmusic.lyric", async () => {
    const pick = await window.showQuickPick([
      {
        label: "Lyric delay",
        description: "Set lyric delay (defult: -1.0)",
      },
      {
        label: "Show all lyric",
      },
    ]);
    if (!pick) {
      return;
    }
    if (pick.label === "Lyric delay") {
      const delay = await window.showInputBox({
        value: `${lyric.delay}`,
        placeHolder: "Please enter lyric delay.",
      });
      if (!delay || !/^-?[0-9]+([.]{1}[0-9]+){0,1}$/.test(delay)) {
        return;
      }
      lyric.delay = parseFloat(delay);
    } else {
      const lyricItem: QuickPickItem[] = [];
      for (let i = 0; i < lyric.text.length; ++i) {
        lyricItem.push({
          label: `[${lyric.time[i]}]`,
          description: lyric.text[i],
        });
      }
      const allLyric = await window.showQuickPick(lyricItem);
      if (allLyric) {
        await window.showInputBox({
          value: allLyric.description,
        });
      }
    }
  });
  commands.registerCommand("cloudmusic.fmTrash", () => {
    apiFmTrash(player.id);
  });
}

export function deactivate(): void {
  MusicCache.verify();
  del.sync([TMP_DIR], { force: true });
}
