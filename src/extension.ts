import { throttle } from "lodash";
import { commands, ExtensionContext, window } from "vscode";
import { existsSync, mkdirSync, readFileSync, unlink, writeFile } from "fs";
import { ACCOUNT_FILE, SETTING_DIR } from "./constant/setting";
import { AccountManager } from "./manager/accountManager";
import { ButtonManager } from "./manager/buttonManager";
import {
  PlaylistItemTreeItem,
  PlaylistProvider,
} from "./provider/playlistProvider";
import { QueueProvider, QueueItemTreeItem } from "./provider/queueProvider";
import { apiLike } from "./util/api";
import { player } from "./util/player";

async function initAccount(
  userPlaylistProvider: PlaylistProvider,
  favoritePlaylistProvider: PlaylistProvider,
  queueProvider: QueueProvider
) {
  if (!existsSync(SETTING_DIR)) {
    mkdirSync(SETTING_DIR);
  }
  if (existsSync(ACCOUNT_FILE)) {
    try {
      const { phone, account, password } = JSON.parse(
        readFileSync(ACCOUNT_FILE, "utf8")
      );
      if (await AccountManager.login(phone, account, password)) {
        firstLogin(
          userPlaylistProvider,
          favoritePlaylistProvider,
          queueProvider
        );
        ButtonManager.buttonAccount(
          "$(account)",
          AccountManager.nickname,
          "cloudmusic.signout"
        );
        ButtonManager.show();
      }
    } catch {}
  }
}

let loginFlag = false;

async function firstLogin(
  userPlaylistProvider: PlaylistProvider,
  favoritePlaylistProvider: PlaylistProvider,
  queueProvider: QueueProvider
) {
  player.start();
  player.volume(85);

  if (loginFlag) {
    return;
  }
  loginFlag = true;

  initPlaylistProvider(userPlaylistProvider, favoritePlaylistProvider);
  initQueueProvider(queueProvider);
}

async function initPlaylistProvider(
  up: PlaylistProvider,
  fp: PlaylistProvider
) {
  window.registerTreeDataProvider("userPlaylist", up);
  window.registerTreeDataProvider("favoritePlaylist", fp);

  commands.registerCommand(
    "cloudmusic.refreshPlaylist",
    throttle(PlaylistProvider.refresh, 2048)
  );
  commands.registerCommand(
    "cloudmusic.refreshPlaylistContent",
    throttle(
      (element: PlaylistItemTreeItem) => PlaylistProvider.refresh(element),
      2048
    )
  );
  commands.registerCommand(
    "cloudmusic.playPlaylist",
    throttle(
      (element: PlaylistItemTreeItem) =>
        PlaylistProvider.playPlaylist(element.item.id),
      1024
    )
  );
  commands.registerCommand(
    "cloudmusic.addPlaylist",
    throttle(
      (element: PlaylistItemTreeItem) =>
        PlaylistProvider.addPlaylist(element.item.id),
      1024
    )
  );
  commands.registerCommand(
    "cloudmusic.intelligence",
    throttle((element: QueueItemTreeItem) => {
      PlaylistProvider.intelligence(element);
      player.load(element);
    }, 1024)
  );
  commands.registerCommand(
    "cloudmusic.addSong",
    throttle(
      (element: QueueItemTreeItem) => PlaylistProvider.addSong(element),
      512
    )
  );
  commands.registerCommand(
    "cloudmusic.playSongWithPlaylist",
    throttle((element: QueueItemTreeItem) => {
      PlaylistProvider.playPlaylist(element.pid, element);
      player.load(element);
    }, 1024)
  );
}

async function initQueueProvider(p: QueueProvider) {
  window.registerTreeDataProvider("queue", p);

  commands.registerCommand(
    "cloudmusic.clearQueue",
    throttle(async () => {
      p.clear();
      p.refresh();
      player.quit();
    }, 2048)
  );
  commands.registerCommand(
    "cloudmusic.randomQueue",
    throttle(async () => {
      p.random();
      p.refresh();
      player.quit();
    }, 512)
  );
  commands.registerCommand(
    "cloudmusic.playSong",
    throttle(async (element: QueueItemTreeItem) => {
      p.top(element);
      p.refresh();
      player.load(element);
    }, 512)
  );
  commands.registerCommand(
    "cloudmusic.deleteSong",
    throttle((element: QueueItemTreeItem) => {
      p.delete(element.item.id);
      p.refresh();
    }, 512)
  );
}

export function activate(context: ExtensionContext): void {
  const userPlaylistProvider = PlaylistProvider.getUserInstance();
  const favoritePlaylistProvider = PlaylistProvider.getFavoriteInstance();
  const queueProvider = QueueProvider.getInstance();

  ButtonManager.init();
  initAccount(userPlaylistProvider, favoritePlaylistProvider, queueProvider);

  const signin = commands.registerCommand("cloudmusic.signin", async () => {
    if (AccountManager.loggedIn) {
      return;
    }
    const method = await window.showQuickPick(
      [
        {
          label: "Email",
          description: "use email to sign in",
          phone: false,
        },
        {
          label: "Cellphone",
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
    if (await AccountManager.login(method.phone, account, password)) {
      writeFile(
        ACCOUNT_FILE,
        JSON.stringify({
          phone: method.phone,
          account,
          password,
        }),
        () => {
          //
        }
      );
      firstLogin(userPlaylistProvider, favoritePlaylistProvider, queueProvider);
      ButtonManager.buttonAccount(
        "$(account)",
        AccountManager.nickname,
        "cloudmusic.signout"
      );
      ButtonManager.show();
    }
  });

  context.subscriptions.push(signin);

  const dailySignin = commands.registerCommand(
    "cloudmusic.dailySignin",
    async () => {
      AccountManager.dailySignin();
    }
  );

  context.subscriptions.push(dailySignin);

  const signout = commands.registerCommand("cloudmusic.signout", async () => {
    if (!AccountManager.loggedIn) {
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
      player.quit();
      if (await AccountManager.logout()) {
        try {
          unlink(ACCOUNT_FILE, () => {
            //
          });
        } catch {}

        ButtonManager.buttonAccount(
          "$(account)",
          "Account",
          "cloudmusic.signin"
        );
        ButtonManager.hide();

        PlaylistProvider.refresh();
        queueProvider.clear();
        queueProvider.refresh();
        player.quit();
      }
    }
  });

  context.subscriptions.push(signout);

  const previous = commands.registerCommand(
    "cloudmusic.previous",
    throttle(async () => {
      queueProvider.shift(-1);
      player.load(queueProvider.head);
      queueProvider.refresh();
    }, 256)
  );

  const next = commands.registerCommand(
    "cloudmusic.next",
    throttle(async () => {
      queueProvider.shift(1);
      player.load(queueProvider.head);
      queueProvider.refresh();
    }, 256)
  );

  const play = commands.registerCommand(
    "cloudmusic.play",
    throttle(async () => {
      player.play();
    }, 256)
  );

  const like = commands.registerCommand(
    "cloudmusic.like",
    throttle(async () => {
      const islike = !queueProvider.islike;
      const id = queueProvider.head.item.id;
      if (await apiLike(id, islike ? "" : "false")) {
        queueProvider.islike = islike;
        ButtonManager.buttonLike(islike);
        islike
          ? AccountManager.likelist.add(id)
          : AccountManager.likelist.delete(id);
      }
    }, 512)
  );

  const volume = commands.registerCommand("cloudmusic.volume", async () => {
    const volume = await window.showInputBox({
      placeHolder: "Please enter volume between 0 and 100.",
    });
    if (volume && /^\d+$/.exec(volume)) {
      player.volume(Number(volume));
    }
  });

  context.subscriptions.push(previous);
  context.subscriptions.push(next);
  context.subscriptions.push(play);
  context.subscriptions.push(like);
  context.subscriptions.push(volume);
}

export function deactivate(): void {
  player.quit();
}
