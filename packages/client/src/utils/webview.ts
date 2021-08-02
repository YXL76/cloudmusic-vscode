import type {
  CSMessage,
  CommentCMsg,
  CommentCSMsg,
  LyricSMsg,
  MsicRankingCMsg,
} from "@cloudmusic/shared";
import { ColorThemeKind, Uri, ViewColumn, commands, window } from "vscode";
import {
  IPC,
  MultiStepInput,
  State,
  pickAlbum,
  pickArtist,
  pickSong,
  pickUser,
} from ".";
import type { ProviderSMsg, WebviewType } from "@cloudmusic/shared";
import type { WebviewView, WebviewViewProvider } from "vscode";
import { AccountManager } from "../manager";
import { NeteaseEnum } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import { SETTING_DIR } from "../constant";
import i18n from "../i18n";
import { resolve } from "path";
import { toDataURL } from "qrcode";

const getNonce = (): string => {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};

export class AccountViewProvider implements WebviewViewProvider {
  private static _view?: WebviewView;

  constructor(
    private readonly _extUri: Uri,
    private readonly _volume: number
  ) {}

  static master(): void {
    if (this._view) {
      const msg: ProviderSMsg = { command: "master", is: State.master };
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

  static wasmLoad(path: string): void {
    if (this._view) {
      const url = this._view.webview.asWebviewUri(Uri.file(path)).toString();
      const msg: ProviderSMsg = { command: "load", url };
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

  static wasmVolume(level: number): void {
    if (this._view) {
      const msg: ProviderSMsg = { command: "volume", level };
      void this._view.webview.postMessage(msg);
    }
  }

  /* static position(position: number): void {
    const msg: ProviderSMsg = { command: "position", position });
  } */

  static account(profiles: NeteaseTypings.Profile[]): void {
    if (this._view) {
      const msg: ProviderSMsg = { command: "account", profiles };
      void this._view.webview.postMessage(msg);
    }
  }

  static metadata(): void {
    if (this._view) {
      const item = State.playItem;
      const msg: ProviderSMsg = item
        ? {
            command: "metadata",
            // duration: item.item.dt / 1000,
            title: item.label,
            artist: item.description,
            album: item.tooltip,
            artwork: [{ src: item.item.al.picUrl }],
          }
        : { command: "metadata" };
      void this._view.webview.postMessage(msg);
    }
  }

  resolveWebviewView(
    webview: WebviewView
    // context: WebviewViewResolveContext
    // token: CancellationToken
  ): void {
    AccountViewProvider._view = webview;

    webview.title = i18n.word.account;
    webview.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extUri, Uri.file(SETTING_DIR)],
    };

    type Msg =
      | { command: "pageLoaded" }
      | { command: "toggle" }
      | { command: "previous" }
      | { command: "nexttrack" }
      | { command: "account"; userId: number }
      | { command: "end" }
      | { command: "load" }
      | { command: "position"; pos: number }
      | { command: "playing"; playing: boolean };

    webview.webview.onDidReceiveMessage((msg: Msg) => {
      switch (msg.command) {
        case "pageLoaded":
          {
            const files = ["flac", "m4a", "ogg", "opus"].map((ext) =>
              webview.webview
                .asWebviewUri(
                  Uri.joinPath(this._extUri, "media", "audio", `silent.${ext}`)
                )
                .toString()
            );
            const msg: ProviderSMsg = { command: "test", files };
            AccountViewProvider.master();
            AccountViewProvider.account([...AccountManager.accounts.values()]);
            AccountViewProvider.metadata();
            void webview.webview.postMessage(msg);
            AccountViewProvider.wasmVolume(this._volume);
          }
          break;
        case "account":
          AccountManager.accountQuickPick(msg.userId);
          break;
        case "end":
          if (State.repeat) IPC.load();
          else void commands.executeCommand("cloudmusic.next");
          break;
        case "load":
          IPC.loaded();
          break;
        case "position":
          IPC.position(msg.pos);
          break;
        case "playing":
          IPC.playing(msg.playing);
          break;
        default:
          void commands.executeCommand(`cloudmusic.${msg.command}`);
          break;
      }
    });

    const js = webview.webview
      .asWebviewUri(Uri.joinPath(this._extUri, "dist", "provider.js"))
      .toString();
    const css = webview.webview
      .asWebviewUri(Uri.joinPath(this._extUri, "dist", "style.css"))
      .toString();

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
  <script type="module" src=${js} nonce=${getNonce()}></script>
</html>`;
  }
}

export class Webview {
  private static readonly _cssUri = Uri.file(resolve(__dirname, "style.css"));

  private static readonly _iconUri = Uri.file(
    resolve(__dirname, "..", "media", "icon.ico")
  );

  static async login(): Promise<void> {
    const key = await IPC.netease("loginQrKey", []);
    if (!key) return;
    const imgSrc = await toDataURL(
      `https://music.163.com/login?codekey=${key}`
    );
    const { panel, setHtml } = this._getPanel(i18n.word.signIn, "login");

    panel.webview.onDidReceiveMessage(({ channel }: CSMessage) => {
      void panel.webview.postMessage({ msg: { imgSrc }, channel });
    });

    return new Promise((resolve, reject) => {
      const timer = setInterval(
        () =>
          void IPC.netease("loginQrCheck", [key])
            .then((code) => {
              if (code === 803) {
                panel.dispose();
                resolve();
              } else if (code === 800) {
                panel.dispose();
                void window.showErrorMessage(i18n.sentence.fail.signIn);
                reject();
              }
            })
            .catch(reject),
        512
      );
      panel.onDidDispose(() => clearInterval(timer));
      setHtml();
    });
  }

  static lyric(): void {
    const { panel, setHtml } = this._getPanel(i18n.word.lyric, "lyric");

    panel.onDidDispose(() => {
      State.lyric.updatePanel = undefined;
      State.lyric.updateFontSize = undefined;
    });

    State.lyric.updatePanel = (oi: number, ti: number) =>
      panel.webview.postMessage({
        command: "lyric",
        data: {
          otext: State.lyric.o.text?.[oi],
          ttext: State.lyric.t.text?.[ti],
        },
      } as LyricSMsg);
    State.lyric.updateFontSize = (size: number) =>
      panel.webview.postMessage({
        command: "size",
        data: size,
      } as LyricSMsg);

    setHtml();
  }

  static async description(id: number, name: string): Promise<void> {
    const desc = await IPC.netease("artistDesc", [id]);
    const { panel, setHtml } = this._getPanel(name, "description");

    panel.webview.onDidReceiveMessage(({ channel }: CSMessage) => {
      void panel.webview.postMessage({ msg: { name, desc }, channel });
    });
    setHtml();
  }

  static async musicRanking(uid: number): Promise<void> {
    const record = await IPC.netease("userRecord", [uid]);
    const { panel, setHtml } = this._getPanel(
      i18n.word.musicRanking,
      "musicRanking"
    );

    panel.webview.onDidReceiveMessage(
      ({ msg, channel }: CSMessage | MsicRankingCMsg) => {
        if (channel) {
          void panel.webview.postMessage({ msg: record, channel });
          return;
        }
        if (!msg) return;
        switch (msg.command) {
          case "song":
            void MultiStepInput.run(async (input) =>
              pickSong(
                input,
                1,
                (await IPC.netease("songDetail", [uid, [msg.id]]))[0]
              )
            );
            break;
          case "album":
            void MultiStepInput.run((input) => pickAlbum(input, 1, msg.id));
            break;
          case "artist":
            void MultiStepInput.run((input) => pickArtist(input, 1, msg.id));
            break;
        }
      }
    );
    setHtml();
  }

  static comment(
    type: NeteaseEnum.CommentType,
    gid: number,
    title: string
  ): void {
    let time = 0;
    let index = 0;
    let pageNo = 1;
    const pageSize = 30;

    const sortTypes = [
      NeteaseEnum.SortType.hottest,
      ...(type === NeteaseEnum.CommentType.dj
        ? []
        : [NeteaseEnum.SortType.recommendation]),
      NeteaseEnum.SortType.latest,
    ];
    const titles = [
      i18n.word.hottest,
      ...(type === NeteaseEnum.CommentType.dj
        ? []
        : [i18n.word.recommendation]),
      i18n.word.latest,
    ];

    const getList = async () => {
      const list = await IPC.netease("commentNew", [
        type,
        gid,
        pageNo,
        pageSize,
        sortTypes[index],
        time,
      ]);
      time = list.comments?.[list.comments.length - 1]?.time || 0;
      return list;
    };

    const { panel, setHtml } = this._getPanel(
      `${i18n.word.comment} (${title})`,
      "comment"
    );

    panel.webview.onDidReceiveMessage(
      async ({ msg, channel }: CSMessage<CommentCSMsg> | CommentCMsg) => {
        if (!channel) {
          switch (msg.command) {
            case "user":
              void MultiStepInput.run((input) => pickUser(input, 1, msg.id));
              break;
            /* case "floor":
              await apiCommentFloor(type, gid, id, pageSize, time);
              break;
            case "reply":
              break; */
          }
          return;
        }

        if (msg.command === "init") {
          void panel.webview.postMessage({
            msg: { titles, ...(await getList()) },
            channel,
          });
          return;
        }
        if (msg.command === "like") {
          void panel.webview.postMessage({
            msg: await IPC.netease("commentLike", [type, msg.t, gid, msg.id]),
            channel,
          });
          return;
        }
        switch (msg.command) {
          case "prev":
            if (pageNo <= 1) return;
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
        void panel.webview.postMessage({
          msg: { ...(await getList()) },
          channel,
        });
      }
    );

    setHtml();
  }

  private static _getPanel(title: string, type: WebviewType) {
    const panel = window.createWebviewPanel(
      "Cloudmusic",
      title,
      ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    panel.iconPath = this._iconUri;
    const css = panel.webview.asWebviewUri(this._cssUri).toString();
    const js = panel.webview
      .asWebviewUri(Uri.file(resolve(__dirname, `${type}.js`)))
      .toString();
    return {
      panel,
      setHtml: () => (panel.webview.html = this._layout(title, css, js)),
    };
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
