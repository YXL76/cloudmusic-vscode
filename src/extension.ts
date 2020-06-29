import { commands, ExtensionContext, window } from "vscode";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { ACCOUNT_FILE, SETTING_DIR } from "./constant/setting";
import { AccountManager } from "./manager/accountManager";
import { ButtonLabel, ButtonManager } from "./manager/buttonManager";
import {
  PlaylistItemTreeItem,
  PlaylistProvider,
  PlaylistContentTreeItem,
} from "./provider/playlistProvider";
import { QueueProvider, QueueItemTreeItem } from "./provider/queueProvider";
import { Player } from "./util/player";
import { playCallback } from "./util/util";
import { PlaylistManager } from "./manager/playlistManager";

async function initAccount() {
  if (!existsSync(SETTING_DIR)) {
    mkdirSync(SETTING_DIR);
  }
  if (existsSync(ACCOUNT_FILE)) {
    try {
      const { phone, account, password } = JSON.parse(
        readFileSync(ACCOUNT_FILE, "utf8")
      );
      if (await AccountManager.login(phone, account, password)) {
        initPlaylistProvider();
        initQueueProvider();
        initButtonManager();
      }
    } catch {}
  }
}

let initPlaylistProviderFlag = false;

async function initPlaylistProvider() {
  if (initPlaylistProviderFlag) {
    return;
  }
  initPlaylistProviderFlag = true;

  const p = PlaylistProvider.getInstance();
  window.registerTreeDataProvider("playlist", p);
  commands.registerCommand("cloudmusic.refreshPlaylist", () => p.refresh());
  commands.registerCommand(
    "cloudmusic.refreshPlaylistContent",
    (element: PlaylistItemTreeItem) => p.refresh(element)
  );
  commands.registerCommand(
    "cloudmusic.playPlaylist",
    (element: PlaylistItemTreeItem) => p.playPlaylist(element.item.id)
  );
  commands.registerCommand(
    "cloudmusic.addPlaylist",
    (element: PlaylistItemTreeItem) => p.addPlaylist(element.item.id)
  );
  commands.registerCommand(
    "cloudmusic.intelligence",
    (element: PlaylistContentTreeItem) => p.intelligence(element)
  );
  commands.registerCommand(
    "cloudmusic.addSong",
    (element: PlaylistContentTreeItem) => p.addSong(element)
  );
  commands.registerCommand(
    "cloudmusic.playSongWithPlaylist",
    (element: PlaylistContentTreeItem) =>
      p.playPlaylist(element.pid, element, playCallback)
  );
}

let initQueueProviderFlag = false;

async function initQueueProvider() {
  if (initQueueProviderFlag) {
    return;
  }
  initQueueProviderFlag = true;

  const p = QueueProvider.getInstance();
  window.registerTreeDataProvider("queue", p);
  commands.registerCommand("cloudmusic.clearQueue", async () => {
    p.clear();
    p.refresh();
    Player.stop();
  });
  commands.registerCommand("cloudmusic.randomQueue", async () => {
    p.random();
    p.refresh();
    Player.stop();
  });
  commands.registerCommand(
    "cloudmusic.playSong",
    async (element: QueueItemTreeItem) => {
      p.top(element);
      p.refresh();
      Player.load(await PlaylistManager.trackUrl(element.item.id));
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

function initButtonManager() {
  const buttonManager = ButtonManager.getInstance();
  buttonManager.updateButton(
    ButtonLabel.Account,
    "$(account)",
    AccountManager.nickname,
    "cloudmusic.signout"
  );
  buttonManager.show();
}

export function activate(context: ExtensionContext) {
  Player.start();

  initAccount();

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
            writeFileSync(
              ACCOUNT_FILE,
              JSON.stringify({
                phone: method.phone,
                account,
                password,
              })
            );
            initPlaylistProvider();
            initQueueProvider();
            initButtonManager();
          }
        }
      }
    }
  });

  context.subscriptions.push(signin);

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
        Player.stop();
        await AccountManager.logout();
        try {
          unlinkSync(ACCOUNT_FILE);
        } catch {}

        const buttonManager = ButtonManager.getInstance();
        buttonManager.updateButton(
          ButtonLabel.Account,
          "$(account)",
          "Account",
          "cloudmusic.signin"
        );
        buttonManager.hide();

        const playlistProvider = PlaylistProvider.getInstance();
        playlistProvider.refresh();
        const queueProvider = QueueProvider.getInstance();
        queueProvider.clear();
        queueProvider.refresh();
      }
    }
  });

  context.subscriptions.push(signout);

  const previous = commands.registerCommand("cloudmusic.previous", async () => {
    const p = QueueProvider.getInstance();
    p.shift(-1, playCallback);
    p.refresh();
  });

  const next = commands.registerCommand("cloudmusic.next", async () => {
    const p = QueueProvider.getInstance();
    p.shift(1, playCallback);
    p.refresh();
  });

  const play = commands.registerCommand("cloudmusic.play", async () => {
    Player.togglePause();
  });

  const like = commands.registerCommand("cloudmusic.like", async () => {});
  const volume = commands.registerCommand("cloudmusic.volume", async () => {
    const volume = await window.showInputBox({
      placeHolder: "Please enter volume between 0 and 100.",
    });
    if (volume && /^\d+$/.exec(volume)) {
      Player.volume(Number(volume));
    }
  });

  context.subscriptions.push(previous);
  context.subscriptions.push(next);
  context.subscriptions.push(play);
  context.subscriptions.push(like);
  context.subscriptions.push(volume);
}

export function deactivate() {
  Player.quit();
}
