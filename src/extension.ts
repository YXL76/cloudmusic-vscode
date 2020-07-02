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
  commands.registerCommand("cloudmusic.refreshPlaylist", () =>
    PlaylistProvider.refresh()
  );
  commands.registerCommand(
    "cloudmusic.refreshPlaylistContent",
    (element: PlaylistItemTreeItem) => PlaylistProvider.refresh(element)
  );
  commands.registerCommand(
    "cloudmusic.playPlaylist",
    (element: PlaylistItemTreeItem) =>
      PlaylistProvider.playPlaylist(element.item.id)
  );
  commands.registerCommand(
    "cloudmusic.addPlaylist",
    (element: PlaylistItemTreeItem) =>
      PlaylistProvider.addPlaylist(element.item.id)
  );
  commands.registerCommand(
    "cloudmusic.intelligence",
    (element: QueueItemTreeItem) => {
      PlaylistProvider.intelligence(element);
      player.load(element);
    }
  );
  commands.registerCommand("cloudmusic.addSong", (element: QueueItemTreeItem) =>
    PlaylistProvider.addSong(element)
  );
  commands.registerCommand(
    "cloudmusic.playSongWithPlaylist",
    (element: QueueItemTreeItem) => {
      PlaylistProvider.playPlaylist(element.pid, element);
      player.load(element);
    }
  );
}

let initQueueProviderFlag = false;

async function initQueueProvider(p: QueueProvider) {
  if (initQueueProviderFlag) {
    return;
  }
  initQueueProviderFlag = true;

  window.registerTreeDataProvider("queue", p);
  commands.registerCommand("cloudmusic.clearQueue", async () => {
    p.clear();
    p.refresh();
    player.stop();
  });
  commands.registerCommand("cloudmusic.randomQueue", async () => {
    p.random();
    p.refresh();
    player.stop();
  });
  commands.registerCommand(
    "cloudmusic.playSong",
    async (element: QueueItemTreeItem) => {
      p.top(element);
      p.refresh();
      player.load(element);
    }
  );
  commands.registerCommand(
    "cloudmusic.deleteSong",
    (element: QueueItemTreeItem) => {
      p.delete(element.item.id);
      p.refresh();
    }
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

  const previous = commands.registerCommand("cloudmusic.previous", async () => {
    queueProvider.shift(-1);
    player.load(queueProvider.head);
    queueProvider.refresh();
  });

  const next = commands.registerCommand("cloudmusic.next", async () => {
    queueProvider.shift(1);
    player.load(queueProvider.head);
    queueProvider.refresh();
  });

  const play = commands.registerCommand("cloudmusic.play", async () => {
    player.togglePause();
  });

  const like = commands.registerCommand("cloudmusic.like", async () => {
    const islike = !queueProvider.islike;
    const id = queueProvider.head.item.id;
    if (await apiLike(id, islike ? "" : "false")) {
      queueProvider.islike = islike;
      buttonLike(islike);
      islike
        ? AccountManager.likelist.add(id)
        : AccountManager.likelist.delete(id);
    }
  });

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
