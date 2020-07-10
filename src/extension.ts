import * as crypto from "crypto";
import { posix } from "path";
import { commands, ExtensionContext, window } from "vscode";
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
  CACHE_DIR,
  TMP_DIR,
  SETTING_DIR,
  MUSIC_QUALITY,
  MPV_AVAILABLE,
  VLC_AVAILABLE,
} from "./constant/setting";
import { LruCacheValue } from "./constant/type";
import { AccountManager } from "./manager/accountManager";
import { ButtonManager } from "./manager/buttonManager";
import {
  PlaylistItemTreeItem,
  PlaylistProvider,
} from "./provider/playlistProvider";
import { QueueProvider, QueueItemTreeItem } from "./provider/queueProvider";
import { apiLike, apiPlaylistTracks } from "./util/api";
import { load, songPick } from "./util/util";
import { Cache } from "./util/cache";
import { player } from "./util/player";
import { lock } from "./state/lock";
import { lyric } from "./state/play";
import { isLike } from "./state/like";
import { loggedIn } from "./state/login";
const del = require("del");
const cacache = require("cacache");

export function activate(context: ExtensionContext): void {
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
    const pf = posix.join(SETTING_DIR, "cache");
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

  commands.registerCommand("cloudmusic.clearQueue", async () => {
    queueProvider.clear();
    queueProvider.refresh();
    player.id = 0;
    player.quit();
  });
  commands.registerCommand("cloudmusic.randomQueue", () => {
    queueProvider.random();
    queueProvider.refresh();
  });
  commands.registerCommand(
    "cloudmusic.playSong",
    async (element: QueueItemTreeItem) => {
      if (!lock.playerLoad && !lock.queue) {
        lock.queue = true;
        await load(element);
        queueProvider.top(element);
        queueProvider.refresh();
        lock.queue = false;
      }
    }
  );
  commands.registerCommand(
    "cloudmusic.deleteSong",
    async (element: QueueItemTreeItem) => {
      if (!lock.queue) {
        lock.queue = true;
        queueProvider.delete(element);
        queueProvider.refresh();
        lock.queue = false;
      }
    }
  );

  // init status bar button
  ButtonManager.init();

  // init player
  lock.playerLoad = true;
  if (MPV_AVAILABLE || VLC_AVAILABLE) {
    player
      .start()
      .then(() => {
        player.volume(85);
        lock.playerLoad = false;
      })
      .catch(() => window.showErrorMessage("Player is unavailable"));
  } else {
    window.showErrorMessage("Player is unavailable");
  }

  // sign in command
  const signin = commands.registerCommand("cloudmusic.signin", async () => {
    if (loggedIn.get()) {
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
  const signout = commands.registerCommand("cloudmusic.signout", async () => {
    if (!loggedIn.get()) {
      return;
    }
    const method = await window.showQuickPick([
      {
        label: AccountManager.nickname,
        description: "current user",
      },
      {
        label: "Sign out",
        description: "",
      },
    ]);
    if (method && method.label === "Sign out") {
      AccountManager.logout();
      try {
        unlink(ACCOUNT_FILE, () => {
          //
        });
      } catch {}
      window.showInformationMessage("Sign out success");
    }
  });

  // previous command
  const previous = commands.registerCommand("cloudmusic.previous", async () => {
    if (!lock.playerLoad && !lock.queue && queueProvider.songs.length > 1) {
      lock.queue = true;
      await load(queueProvider.songs[-1]);
      queueProvider.shift(-1);
      queueProvider.refresh();
      lock.queue = false;
    }
  });

  // next command
  const next = commands.registerCommand("cloudmusic.next", async () => {
    if (!lock.playerLoad && !lock.queue && queueProvider.songs.length > 1) {
      lock.queue = true;
      await load(queueProvider.songs[1]);
      queueProvider.shift(1);
      queueProvider.refresh();
      lock.queue = false;
    }
  });

  // play command
  const play = commands.registerCommand("cloudmusic.play", async () => {
    player.togglePlay();
  });

  // like command
  const like = commands.registerCommand("cloudmusic.like", async () => {
    const islike = !isLike.get();
    const id = queueProvider.songs[0].item.id;
    if (await apiLike(id, islike ? "" : "false")) {
      isLike.set(islike);
      islike
        ? AccountManager.likelist.add(id)
        : AccountManager.likelist.delete(id);
    }
  });

  // volume command
  const volume = commands.registerCommand("cloudmusic.volume", async () => {
    const volume = await window.showInputBox({
      placeHolder: "Please enter volume between 0 and 100.",
    });
    if (volume && /^\d+$/.exec(volume)) {
      player.volume(parseInt(volume));
    }
  });

  context.subscriptions.push(signin);
  context.subscriptions.push(dailyCheck);
  context.subscriptions.push(signout);
  context.subscriptions.push(previous);
  context.subscriptions.push(next);
  context.subscriptions.push(play);
  context.subscriptions.push(like);
  context.subscriptions.push(volume);

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
      if (!lock.queue) {
        lock.queue = true;
        await PlaylistProvider.playPlaylist(element.item.id);
        lock.queue = false;
        if (!lock.playerLoad) {
          load(queueProvider.songs[0]);
        }
      }
    }
  );
  commands.registerCommand(
    "cloudmusic.addPlaylist",
    (element: PlaylistItemTreeItem) =>
      PlaylistProvider.addPlaylist(element.item.id)
  );
  commands.registerCommand(
    "cloudmusic.intelligence",
    async (element: QueueItemTreeItem) => {
      await PlaylistProvider.intelligence(element);
      if (!lock.playerLoad) {
        load(element);
      }
    }
  );
  commands.registerCommand("cloudmusic.addSong", (element: QueueItemTreeItem) =>
    PlaylistProvider.addSong(element)
  );
  commands.registerCommand(
    "cloudmusic.playSongWithPlaylist",
    async (element: QueueItemTreeItem) => {
      await PlaylistProvider.playPlaylist(element.pid, element);
      if (!lock.playerLoad) {
        load(element);
      }
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
  cacache.ls(CACHE_DIR).then((res: { key: LruCacheValue }) => {
    for (const item in res) {
      const { key, integrity, size } = res[item];
      Cache.lruCache.set(key, { integrity, size });
    }
  });

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
        description: "Set lyric delay (defult: -1.5)",
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
    }
  });
}

export function deactivate(): void {
  player.quit();
  cacache.verify(CACHE_DIR);
  del.sync([TMP_DIR], { force: true });
}
