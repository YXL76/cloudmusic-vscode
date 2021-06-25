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
import type { WebviewView, WebviewViewProvider } from "vscode";
import { AccountManager } from "../manager";
import { NeteaseEnum } from "@cloudmusic/shared";
import type { WebviewType } from "@cloudmusic/shared";
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
  private static _html = "";

  private static _view?: WebviewView;

  constructor(private readonly _extensionUri: Uri) {}

  /* static master(): void {
    this._view?.webview.postMessage({ command: "master", is: State.master });
  } */

  static play(): void {
    this._view?.webview.postMessage({ command: "state", state: "playing" });
  }

  static pause(): void {
    this._view?.webview.postMessage({ command: "state", state: "paused" });
  }

  static stop(): void {
    this._view?.webview.postMessage({ command: "state", state: "none" });
  }

  /* static position(position: number): void {
    this._view?.webview.postMessage({ command: "position", position });
  } */

  static metadata(): void {
    const item = State.playItem;
    this._view?.webview.postMessage(
      item
        ? {
            command: "metadata",
            // duration: item.item.dt / 1000,
            title: item.label,
            artist: item.description,
            album: item.tooltip,
            artwork: [{ src: item.item.al.picUrl }],
          }
        : { command: "metadata" }
    );
  }

  static toggleHTML(master: boolean): void {
    if (this._view?.webview) {
      if (master) {
        this._view.webview.html = this._html;
        setTimeout(() => AccountViewProvider.metadata(), 4096);
      } else this._view.webview.html = "";
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
    };

    type Msg = { command: "toggle" | "previous" | "nexttrack" };

    /* webview.webview.onDidReceiveMessage(({ command }: Msg) => {
      if (State.master) void commands.executeCommand(`cloudmusic.${command}`);
    }); */

    webview.webview.onDidReceiveMessage(({ command }: Msg) =>
      commands.executeCommand(`cloudmusic.${command}`)
    );

    const files = ["silent.flac", "silent.m4a", "silent.ogg", "silent.opus"];

    const sources = files
      .map((fn) =>
        webview.webview
          .asWebviewUri(Uri.joinPath(this._extensionUri, "media", "audio", fn))
          .toString()
      )
      .map((src) => `<source src=${src} >`)
      .join();

    const js = webview.webview
      .asWebviewUri(Uri.joinPath(this._extensionUri, "dist", "provider.js"))
      .toString();

    AccountViewProvider._html = `
<!DOCTYPE html>
<html
  lang="en"
  ${window.activeColorTheme.kind === ColorThemeKind.Light ? "" : 'class="dark"'}
>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${i18n.word.account}</title>
    <script type="module" src=${js} nonce=${getNonce()}></script>
  </head>
  <body>
    <div id="root">
      <audio id="audio" autoPlay loop onplay="window.handleFirstPlay(event)">${sources}</audio>
    </div>
  </body>
</html>`;

    if (State.master) {
      webview.webview.html = AccountViewProvider._html;
      setTimeout(() => AccountViewProvider.metadata(), 4096);
    }

    // setTimeout(() => AccountViewProvider.master(), 1024);
  }
}

export class Webview {
  private static readonly cssUri = Uri.file(resolve(__dirname, "style.css"));

  private static readonly iconUri = Uri.file(
    resolve(__dirname, "..", "media", "icon.ico")
  );

  static async login(): Promise<void> {
    const key = await IPC.netease("loginQrKey", []);
    if (!key) return;
    const imgSrc = await toDataURL(
      `https://music.163.com/login?codekey=${key}`
    );
    const { panel, setHtml } = this.getPanel(i18n.word.signIn, "login");

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
            .catch(resolve),
        512
      );
      panel.onDidDispose(() => clearInterval(timer));
      setHtml();
    });
  }

  static lyric(): void {
    const { panel, setHtml } = this.getPanel(i18n.word.lyric, "lyric");

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
    const { panel, setHtml } = this.getPanel(name, "description");

    panel.webview.onDidReceiveMessage(({ channel }: CSMessage) => {
      void panel.webview.postMessage({ msg: { name, desc }, channel });
    });
    setHtml();
  }

  static async musicRanking(): Promise<void> {
    const record = await IPC.netease("userRecord", [AccountManager.uid]);
    const { panel, setHtml } = this.getPanel(
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
                (await IPC.netease("songDetail", [[msg.id]]))[0]
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

    const { panel, setHtml } = this.getPanel(
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

  private static getPanel(title: string, type: WebviewType) {
    const panel = window.createWebviewPanel(
      "Cloudmusic",
      title,
      ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    panel.iconPath = this.iconUri;
    const css = panel.webview.asWebviewUri(this.cssUri).toString();
    const js = panel.webview
      .asWebviewUri(Uri.file(resolve(__dirname, `${type}.js`)))
      .toString();
    return {
      panel,
      setHtml: () => (panel.webview.html = this.layout(title, css, js)),
    };
  }

  private static layout(title: string, css: string, js: string) {
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
