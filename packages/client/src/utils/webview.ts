import { CONTEXT, IPC, MultiStepInput, STATE, pickAlbum, pickArtist, pickSong, pickUser } from "./index.js";
import type {
  CSMessage,
  CommentCMsg,
  CommentCSMsg,
  LoginSMsg,
  LyricSMsg,
  MusicRankingCMsg,
  ProviderCMsg,
} from "@cloudmusic/shared";
import { ColorThemeKind, Uri, ViewColumn, commands, window, workspace } from "vscode";
import { NeteaseCommentType, NeteaseSortType } from "@cloudmusic/shared";
import type { ProviderSMsg, WebviewType } from "@cloudmusic/shared";
import { SPEED_KEY, VOLUME_KEY } from "../constant/index.js";
import type { WebviewView, WebviewViewProvider } from "vscode";
import { AccountManager } from "../manager/index.js";
import type { NeteaseTypings } from "api";
import i18n from "../i18n/index.js";

const getNonce = (): string => {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};

export class AccountViewProvider implements WebviewViewProvider {
  private static _view?: WebviewView;

  static master(): void {
    if (this._view) {
      const msg: ProviderSMsg = { command: "master", is: STATE.master };
      void this._view.webview.postMessage(msg);
    }
  }

  static play(): void {
    if (this._view) {
      const msg: ProviderSMsg = { command: "state", state: "playing" };
      void this._view.webview.postMessage(msg);
    }
  }

  static pause(): void {
    if (this._view) {
      const msg: ProviderSMsg = { command: "state", state: "paused" };
      void this._view.webview.postMessage(msg);
    }
  }

  static stop(): void {
    if (this._view) {
      const msg: ProviderSMsg = { command: "state", state: "none" };
      void this._view.webview.postMessage(msg);
    }
  }

  static wasmLoad(path: string, play: boolean, seek?: number): void {
    if (this._view) {
      const url = this._view.webview.asWebviewUri(Uri.file(path)).toString();
      const msg: ProviderSMsg = { command: "load", url, play, seek };
      void this._view.webview.postMessage(msg);
    }
  }

  static wasmPause(): void {
    if (this._view) {
      const msg: ProviderSMsg = { command: "pause" };
      void this._view.webview.postMessage(msg);
    }
  }

  static wasmPlay(): void {
    if (this._view) {
      const msg: ProviderSMsg = { command: "play" };
      void this._view.webview.postMessage(msg);
    }
  }

  static wasmStop(): void {
    if (this._view) {
      const msg: ProviderSMsg = { command: "stop" };
      void this._view.webview.postMessage(msg);
    }
  }

  static wasmSpeed(speed: number): void {
    if (this._view) {
      const msg: ProviderSMsg = { command: "speed", speed };
      void this._view.webview.postMessage(msg);
    }
  }

  static wasmVolume(level: number): void {
    if (this._view) {
      const msg: ProviderSMsg = { command: "volume", level };
      void this._view.webview.postMessage(msg);
    }
  }

  static wasmSeek(seekOffset: number): void {
    if (this._view) {
      const msg: ProviderSMsg = { command: "seek", seekOffset };
      void this._view.webview.postMessage(msg);
    }
  }

  static account(profiles: NeteaseTypings.Profile[]): void {
    if (this._view) {
      const msg: ProviderSMsg = { command: "account", profiles };
      void this._view.webview.postMessage(msg);
    }
  }

  static metadata(): void {
    if (this._view) {
      const item = STATE.playItem;
      if (!item) {
        const msg: ProviderSMsg = { command: "metadata" };
        void this._view.webview.postMessage(msg);
      } else {
        const data = "mainSong" in item.data ? item.data.mainSong : item.data;
        const msg: ProviderSMsg = {
          command: "metadata",
          duration: data.dt / 1000,
          meta: {
            title: item.label,
            artist: item.description,
            album: item.tooltip,
            artwork: data.al.picUrl ? [{ src: data.al.picUrl }] : undefined,
          },
        };
        /* TODO: image uri
        if (item instanceof LocalFileTreeItem) {
          parseFile(item.data.abspath)
            .then(({ common: { picture } }) => {
              if (!picture?.length || !msg.meta) return;
              const [{ data, format }] = picture;
              const picUrl = `data:${format};base64,${data.toString("base64")}`;
              msg.meta.artwork = [{ src: picUrl }];
            })
            .catch(console.error)
            .finally(() => void this._view?.webview.postMessage(msg));
        } else void this._view.webview.postMessage(msg); */
        void this._view.webview.postMessage(msg);
      }
    }
  }

  async resolveWebviewView(
    webview: WebviewView,
    // context: WebviewViewResolveContext
    // token: CancellationToken
  ): Promise<void> {
    const extUri = CONTEXT.context.extensionUri;
    AccountViewProvider._view = webview;

    const localResourceRoots: string[] = [];
    if (process.platform === "win32") {
      /* const stdout = await new Promise<string>((resolve, reject) => {
        let res = "";
        const p = spawn(
          "powershell.exe",
          [
            "-NoLogo",
            "-NoProfile",
            "-Command",
            "Get-PSDrive -PSProvider FileSystem | Format-Table -Property Root -HideTableHeaders",
          ],
          { shell: false, stdio: ["ignore", "pipe", "ignore"] },
        );
        p.stdout.on("data", (data: Buffer) => (res += data.toString()));
        p.once("close", () => resolve(res)).once("error", reject);
      });
      (stdout || "C:\\")
        .split("\r\n")
        .map((line) => line.trim())
        .filter((line) => line.length === 3)
        .forEach((line) => localResourceRoots.push(line)); */
      for (const i of ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"]) {
        localResourceRoots.push(`${i}:\\`);
      }
    } else localResourceRoots.push("/");

    webview.title = i18n.word.account;
    webview.webview.options = {
      enableScripts: true,
      // localResourceRoots: [extUri, Uri.file(SETTING_DIR)],
      localResourceRoots: localResourceRoots.map(Uri.file.bind(Uri)),
    };

    webview.webview.onDidReceiveMessage((msg: ProviderCMsg) => {
      switch (msg.command) {
        case "pageLoaded":
          AccountViewProvider.master();
          AccountViewProvider.account([...AccountManager.accounts.values()]);
          AccountViewProvider.wasmVolume(CONTEXT.context.globalState.get(VOLUME_KEY, 85));
          AccountViewProvider.wasmSpeed(CONTEXT.context.globalState.get(SPEED_KEY, 1));
          if (STATE.wasm) STATE.downInit(); // 3
          return;
        case "account":
          return AccountManager.accountQuickPick(msg.userId);
        case "end":
          if (STATE.repeat) IPC.load();
          else void commands.executeCommand("cloudmusic.next");
          return;
        case "load":
          return msg.fail ? void commands.executeCommand("cloudmusic.next") : IPC.loaded();
        case "position":
          return IPC.position(msg.pos);
        case "playing":
          return IPC.playing(msg.playing);
        default:
          return void commands.executeCommand(`cloudmusic.${msg.command}`);
      }
    });

    const js = webview.webview.asWebviewUri(Uri.joinPath(extUri, "dist", "provider.js")).toString();
    const css = webview.webview.asWebviewUri(Uri.joinPath(extUri, "dist", "style.css")).toString();

    const audioUri = Uri.joinPath(extUri, "media", "audio");
    const items = await workspace.fs.readDirectory(audioUri);
    const files = items
      .filter(([name]) => name.startsWith("silent"))
      .map(([name]) => webview.webview.asWebviewUri(Uri.joinPath(audioUri, name)).toString());

    webview.webview.html = `
<!DOCTYPE html>
<html
  lang="en"
  ${window.activeColorTheme.kind === ColorThemeKind.Light ? "" : 'class="dark"'}
>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${i18n.word.account}</title>
    <link rel="stylesheet" type="text/css" href=${css} />
  </head>
  <body>
    <div id="root"></div>
  </body>
  <script>window.enablePlayer=${STATE.wasm ? "true" : "false"}</script>
  <script>window.testfiles=${JSON.stringify(files)}</script>
  <script type="module" src=${js} nonce=${getNonce()}></script>
</html>`;

    if (!webview.visible) webview.show();
  }
}

export class Webview {
  static async login(): Promise<void> {
    const key = await IPC.netease("loginQrKey", []);
    if (!key) return;
    const { panel, setHtml } = this._getPanel(i18n.word.signIn, "login");

    panel.webview.onDidReceiveMessage(() => void panel.webview.postMessage(<LoginSMsg>{ command: "key", key }));

    return new Promise((resolve) => {
      const timer = setInterval(
        () =>
          void IPC.netease("loginQrCheck", [key])
            .then(({ code, message }) => {
              if (code === 803) {
                void window.showInformationMessage(`${i18n.sentence.success.signIn} (${message})`);
                return resolve(void panel.dispose());
              } else if (code === 800) {
                void window.showErrorMessage(`${i18n.sentence.fail.signIn} (${message})`);
                return resolve(void panel.dispose());
              }
              void panel.webview.postMessage(<LoginSMsg>{ command: "message", message });
            })
            .catch((err: string) => {
              void window.showErrorMessage(JSON.stringify(err));
              resolve(void panel.dispose());
            }),
        512,
      );
      panel.onDidDispose(() => clearInterval(timer));
      setHtml();
    });
  }

  static lyric(): void {
    const { panel, setHtml } = this._getPanel(i18n.word.lyric, "lyric");

    panel.onDidDispose(() => {
      STATE.lyric.updatePanel = undefined;
      STATE.lyric.updateIndex = undefined;
    });

    STATE.lyric.updatePanel = (text) => void panel.webview.postMessage(<LyricSMsg>{ command: "lyric", text });
    STATE.lyric.updateIndex = (idx) => void panel.webview.postMessage(<LyricSMsg>{ command: "index", idx });

    setHtml();

    // Dirty
    setTimeout(() => STATE.lyric.updatePanel?.(STATE.lyric.text), 1024);
  }

  static async description(id: number, name: string): Promise<void> {
    const desc = await IPC.netease("artistDesc", [id]);
    const { panel, setHtml } = this._getPanel(name, "description");

    panel.webview.onDidReceiveMessage(
      ({ channel }: CSMessage) => void panel.webview.postMessage({ msg: { name, desc }, channel }),
    );
    setHtml();
  }

  static async musicRanking(uid: number): Promise<void> {
    const record = await IPC.netease("userRecord", [uid]);
    const { panel, setHtml } = this._getPanel(i18n.word.musicRanking, "musicRanking");

    panel.webview.onDidReceiveMessage(({ msg, channel }: CSMessage | MusicRankingCMsg) => {
      if (channel) return void panel.webview.postMessage({ msg: record, channel });

      if (!msg) return;
      switch (msg.command) {
        case "song":
          return void MultiStepInput.run(async (input) =>
            pickSong(input, 1, (await IPC.netease("songDetail", [uid, [msg.id]]))[0]),
          );
        case "album":
          return void MultiStepInput.run((input) => pickAlbum(input, 1, msg.id));
        case "artist":
          return void MultiStepInput.run((input) => pickArtist(input, 1, msg.id));
      }
    });

    setHtml();
  }

  static comment(type: NeteaseCommentType, gid: number, title: string): void {
    let time = 0;
    let index = 0;
    let pageNo = 1;
    const pageSize = 30;

    const sortTypes = [
      NeteaseSortType.hottest,
      ...(type === NeteaseCommentType.dj ? [] : [NeteaseSortType.recommendation]),
      NeteaseSortType.latest,
    ];
    const titles = [
      i18n.word.hottest,
      ...(type === NeteaseCommentType.dj ? [] : [i18n.word.recommendation]),
      i18n.word.latest,
    ];

    const getList = async (channel: number) => {
      try {
        const list = await IPC.netease("commentNew", [type, gid, pageNo, pageSize, sortTypes[index], time]);
        time = list.comments?.[list.comments.length - 1]?.time || 0;

        await panel.webview.postMessage({ msg: { titles, list }, channel });
      } catch {
        await panel.webview.postMessage({ err: true, channel });
      }
    };

    const { panel, setHtml } = this._getPanel(`${i18n.word.comment} (${title})`, "comment");

    panel.webview.onDidReceiveMessage(({ msg, channel }: CSMessage<CommentCSMsg> | CommentCMsg) => {
      if (!msg) return;

      if (!channel) {
        switch (msg.command) {
          case "user":
            return void MultiStepInput.run((input) => pickUser(input, 1, msg.id));
          /* case "floor":
              await apiCommentFloor(type, gid, id, pageSize, time);
              break;
            case "reply":
              break; */
          default:
            return;
        }
      }

      if (msg.command === "init") return void getList(channel);

      if (msg.command === "like") {
        return void IPC.netease("commentLike", [type, msg.t, gid, msg.id])
          .then((msg) => panel.webview.postMessage({ msg, channel }))
          .catch(() => panel.webview.postMessage({ err: true, channel }));
      }

      switch (msg.command) {
        case "prev":
          if (pageNo <= 1) return void panel.webview.postMessage({ err: true, channel });

          --pageNo;
          if (index === sortTypes.length - 1) time = 0;
          break;
        case "next":
          ++pageNo;
          break;
        case "tabs":
          time = 0;
          index = msg.index;
          pageNo = 1;
          break;
      }
      return void getList(channel);
    });

    setHtml();
  }

  static async video(mvid: number): Promise<void> {
    const detail = await IPC.netease("mvDetail", [mvid]);
    if (!detail) return;
    const { name, cover, brs } = detail;
    const url = await IPC.netease("mvUrl", [mvid, brs.at(-1)?.br]);
    if (!url) return;

    const { panel, setHtml } = this._getPanel(name, "video");
    panel.webview.onDidReceiveMessage(
      ({ channel }: CSMessage) => void panel.webview.postMessage({ msg: { cover, url }, channel }),
    );
    setHtml();
  }

  private static _getPanel(title: string, type: WebviewType) {
    const panel = window.createWebviewPanel("Cloudmusic", title, ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
    });
    const extUri = CONTEXT.context.extensionUri;
    panel.iconPath = Uri.joinPath(CONTEXT.context.extensionUri, "media", "icon.ico");
    const css = panel.webview.asWebviewUri(Uri.joinPath(extUri, "dist", "style.css")).toString();
    const js = panel.webview.asWebviewUri(Uri.joinPath(extUri, "dist", `${type}.js`)).toString();
    return { panel, setHtml: () => (panel.webview.html = this._layout(title, css, js)) };
  }

  private static _layout(title: string, css: string, js: string) {
    const nonce = getNonce();
    return `
<!DOCTYPE html>
<html
  lang="en"
  ${window.activeColorTheme.kind === ColorThemeKind.Light ? "" : 'class="dark"'}
>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" type="text/css" href=${css} />
  </head>
  <body>
    <div id="root"></div>
  </body>
  <script type="module" src=${js} nonce=${nonce}></script>
</html>`;
  }
}
