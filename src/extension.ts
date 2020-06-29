import { commands, ExtensionContext, window } from "vscode";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { ACCOUNT_FILE, SETTING_DIR } from "./constant/setting";
import { AccountManager } from "./api/accountManager";
import { ButtonManager } from "./api/buttonManager";
import {
  PlaylistItemTreeItem,
  PlaylistProvider,
  PlaylistContentTreeItem,
} from "./provider/playlistProvider";
import { QueueProvider, QueueItemTreeItem } from "./provider/queueProvider";

async function initAccount() {
  if (!existsSync(SETTING_DIR)) {
    mkdirSync(SETTING_DIR);
  }
  if (existsSync(ACCOUNT_FILE)) {
    try {
      const { phone, account, password } = JSON.parse(
        readFileSync(ACCOUNT_FILE, "utf8")
      );
      const accountManager = AccountManager.getInstance();
      if (await accountManager.login(phone, account, password)) {
        initPlaylistProvider();
        initQueueProvider();
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
    async (element: PlaylistItemTreeItem) =>
      await p.playPlaylist(element.item.id)
  );
  commands.registerCommand(
    "cloudmusic.addPlaylist",
    async (element: PlaylistItemTreeItem) =>
      await p.addPlaylist(element.item.id)
  );
  commands.registerCommand(
    "cloudmusic.intelligence",
    async (element: PlaylistContentTreeItem) => await p.intelligence(element)
  );
  commands.registerCommand(
    "cloudmusic.addSong",
    (element: PlaylistContentTreeItem) => p.addSong(element)
  );
  commands.registerCommand(
    "cloudmusic.playSongWithPlaylist",
    async (element: PlaylistContentTreeItem) =>
      await p.playSongWithPlaylist(element)
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
  commands.registerCommand("cloudmusic.clearQueue", () => {
    p.clear();
    p.refresh();
  });
  commands.registerCommand("cloudmusic.randomQueue", () => {
    p.random();
    p.refresh();
  });
  commands.registerCommand(
    "cloudmusic.playSong",
    (element: QueueItemTreeItem) => {
      p.play(element);
      p.refresh();
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

export function activate(context: ExtensionContext) {
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
          const accountManager = AccountManager.getInstance();
          if (await accountManager.login(method.phone, account, password)) {
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
          }
        }
      }
    }
  });

  context.subscriptions.push(signin);

  const singout = commands.registerCommand("cloudmusic.singout", async () => {
    const accountManager = AccountManager.getInstance();
    await accountManager.logout();
  });

  context.subscriptions.push(singout);

  const previous = commands.registerCommand(
    "cloudmusic.previous",
    async () => {}
  );
  const next = commands.registerCommand("cloudmusic.next", async () => {});
  const play = commands.registerCommand("cloudmusic.play", async () => {});
  const like = commands.registerCommand("cloudmusic.like", async () => {});

  context.subscriptions.push(previous);
  context.subscriptions.push(next);
  context.subscriptions.push(play);
  context.subscriptions.push(like);

  ButtonManager.getInstance();
}

export function deactivate() {}
