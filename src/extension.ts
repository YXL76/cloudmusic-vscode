import { throttle } from "lodash";
import { commands, ExtensionContext, window } from "vscode";
import { existsSync, mkdirSync, readFileSync, unlink, writeFile } from "fs";
import { ACCOUNT_FILE, SETTING_DIR } from "./constant/setting";
import { AccountManager } from "./manager/accountManager";
import { ButtonLabel, ButtonManager } from "./manager/buttonManager";
import {
  PlaylistItemTreeItem,
  PlaylistProvider,
} from "./provider/playlistProvider";
import { QueueProvider, QueueItemTreeItem } from "./provider/queueProvider";
import { apiLike } from "./util/api";
import { player } from "./util/player";
import { buttonLike } from "./util/util";

async function initAccount(
  userPlaylistProvider: PlaylistProvider,
  favoritePlaylistProvider: PlaylistProvider,
  queueProvider: QueueProvider,
  buttonManager: ButtonManager
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
        initPlaylistProvider(userPlaylistProvider, favoritePlaylistProvider);
        initQueueProvider(queueProvider);
        initButtonManager(buttonManager);
      }
    } catch {}
  }
}

let initPlaylistProviderFlag = false;

async function initPlaylistProvider(
  up: PlaylistProvider,
  fp: PlaylistProvider
) {
  if (initPlaylistProviderFlag) {
    return;
  }
  initPlaylistProviderFlag = true;

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

let initQueueProviderFlag = false;

async function initQueueProvider(p: QueueProvider) {
  if (initQueueProviderFlag) {
    return;
  }
  initQueueProviderFlag = true;

  window.registerTreeDataProvider("queue", p);
  commands.registerCommand(
    "cloudmusic.clearQueue",
    throttle(async () => {
      p.clear();
      p.refresh();
      player.stop();
    }, 2048)
  );
  commands.registerCommand(
    "cloudmusic.randomQueue",
    throttle(async () => {
      p.random();
      p.refresh();
      player.stop();
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

function initButtonManager(buttonManager: ButtonManager) {
  buttonManager.updateButton(
    ButtonLabel.Account,
    "$(account)",
    AccountManager.nickname,
    "cloudmusic.signout"
  );
  buttonManager.show();
}

export function activate(context: ExtensionContext) {
  player.start();
  player.volume(85);

  const userPlaylistProvider = PlaylistProvider.getUserInstance();
  const favoritePlaylistProvider = PlaylistProvider.getFavoriteInstance();
  const queueProvider = QueueProvider.getInstance();
  const buttonManager = ButtonManager.getInstance();

  initAccount(
    userPlaylistProvider,
    favoritePlaylistProvider,
    queueProvider,
    buttonManager
  );

  const signin = commands.registerCommand("cloudmusic.signin", async () => {
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
    if (method) {
      const account = await window.showInputBox({
        placeHolder: "Please enter your account.",
      });
      if (account) {
        const password = await window.showInputBox({
          placeHolder: "Please enter your password.",
          password: true,
        });
        if (password) {
          if (await AccountManager.login(method.phone, account, password)) {
            writeFile(
              ACCOUNT_FILE,
              JSON.stringify({
                phone: method.phone,
                account,
                password,
              }),
              () => {}
            );
            initPlaylistProvider(
              userPlaylistProvider,
              favoritePlaylistProvider
            );
            initQueueProvider(queueProvider);
            initButtonManager(buttonManager);
          }
        }
      }
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
    if (AccountManager.loggedIn) {
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
        player.stop();
        if (await AccountManager.logout()) {
          try {
            unlink(ACCOUNT_FILE, () => {});
          } catch {}

          buttonManager.updateButton(
            ButtonLabel.Account,
            "$(account)",
            "Account",
            "cloudmusic.signin"
          );
          buttonManager.hide();

          PlaylistProvider.refresh();
          queueProvider.clear();
          queueProvider.refresh();
        }
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
      player.togglePause();
    }, 256)
  );

  const like = commands.registerCommand(
    "cloudmusic.like",
    throttle(async () => {
      const islike = !queueProvider.islike;
      const id = queueProvider.head.item.id;
      if (await apiLike(id, islike ? "" : "false")) {
        queueProvider.islike = islike;
        buttonLike(islike);
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

export function deactivate() {
  player.quit();
}
