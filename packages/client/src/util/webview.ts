import { ColorThemeKind, Uri, ViewColumn, window } from "vscode";
import {
  CommentType,
  SortType,
  apiArtistDesc,
  apiCommentLike,
  apiCommentNew,
  apiLoginQrCheck,
  apiLoginQrKey,
  apiSongDetail,
  apiUserRecord,
} from "../api";
import {
  MultiStepInput,
  lyric,
  pickAlbum,
  pickArtist,
  pickSong,
  pickUser,
} from ".";
import type { CSMessage } from "@cloudmusic/shared";
import i18n from "../i18n";
import { resolve } from "path";
import { toDataURL } from "qrcode";
import { webview } from "@cloudmusic/shared";

const getNonce = (): string => {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};
export class Webview {
  private static readonly cssUri = Uri.file(resolve(__dirname, "style.css"));

  private static readonly jsUri = Uri.file(resolve(__dirname, "webview.js"));

  private static readonly iconUri = Uri.file(
    resolve(__dirname, "..", "media", "icon.ico")
  );

  static async login(): Promise<void> {
    const key = await apiLoginQrKey();
    if (!key) return;
    const imgSrc = await toDataURL(
      `https://music.163.com/login?codekey=${key}`
    );
    const { panel, setHtml } = this.getPanel(
      i18n.word.signIn,
      webview.Type.login
    );

    panel.webview.onDidReceiveMessage(({ channel }: CSMessage) => {
      void panel.webview.postMessage({ msg: { imgSrc }, channel });
    });

    return new Promise((resolve, reject) => {
      const timer = setInterval(
        () =>
          void apiLoginQrCheck(key)
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
    const { panel, setHtml } = this.getPanel(
      i18n.word.lyric,
      webview.Type.lyric
    );

    panel.onDidDispose(() => {
      lyric.updatePanel = undefined;
      lyric.updateFontSize = undefined;
    });

    lyric.updatePanel = (index: number) =>
      panel.webview.postMessage({
        command: "lyric",
        data: {
          otext: lyric.o.text[index],
          ttext: lyric.t.text[index],
        },
      } as webview.LyricSMsg);
    lyric.updateFontSize = (size: number) =>
      panel.webview.postMessage({
        command: "size",
        data: size,
      } as webview.LyricSMsg);

    setHtml();
  }

  static async description(id: number, name: string): Promise<void> {
    const desc = await apiArtistDesc(id);
    const { panel, setHtml } = this.getPanel(name, webview.Type.description);

    panel.webview.onDidReceiveMessage(({ channel }: CSMessage) => {
      void panel.webview.postMessage({ msg: { name, desc }, channel });
    });
    setHtml();
  }

  static async musicRanking(): Promise<void> {
    const record = await apiUserRecord();
    const { panel, setHtml } = this.getPanel(
      i18n.word.musicRanking,
      webview.Type.musicRanking
    );

    panel.webview.onDidReceiveMessage(
      ({ msg, channel }: CSMessage | webview.MsicRankingCMsg) => {
        if (channel) {
          void panel.webview.postMessage({ msg: record, channel });
          return;
        }
        if (!msg) return;
        switch (msg.command) {
          case "song":
            void MultiStepInput.run(async (input) =>
              pickSong(input, 1, (await apiSongDetail([msg.id]))[0])
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

  static comment(type: CommentType, gid: number, title: string): void {
    let time = 0;
    let index = 0;
    let pageNo = 1;
    const pageSize = 30;

    const sortTypes = [
      SortType.hottest,
      ...(type === CommentType.dj ? [] : [SortType.recommendation]),
      SortType.latest,
    ];
    const titles = [
      i18n.word.hottest,
      ...(type === CommentType.dj ? [] : [i18n.word.recommendation]),
      i18n.word.latest,
    ];

    const getList = async () => {
      const list = await apiCommentNew(
        type,
        gid,
        pageNo,
        pageSize,
        sortTypes[index],
        time
      );
      time = list.comments?.[list.comments.length - 1]?.time || 0;
      return list;
    };

    const { panel, setHtml } = this.getPanel(
      `${i18n.word.comment} (${title})`,
      webview.Type.comment
    );

    panel.webview.onDidReceiveMessage(
      async ({
        msg,
        channel,
      }: CSMessage<webview.CommentCSMsg> | webview.CommentCMsg) => {
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
            msg: await apiCommentLike(type, msg.t, gid, msg.id),
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

  private static getPanel(title: string, type: webview.Type) {
    const panel = window.createWebviewPanel(
      "Cloudmusic",
      title,
      ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    panel.iconPath = this.iconUri;
    const css = panel.webview.asWebviewUri(this.cssUri).toString();
    const js = panel.webview.asWebviewUri(this.jsUri).toString();
    return {
      panel,
      setHtml: () => (panel.webview.html = this.layout(title, type, css, js)),
    };
  }

  private static layout(
    title: string,
    type: webview.Type,
    css: string,
    js: string
  ) {
    const nonce = getNonce();
    return `
<!DOCTYPE html>
<html
  lang="en"
  class=${window.activeColorTheme.kind === ColorThemeKind.Light ? "" : "dark"}
>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" type="text/css" href=${css} />
    <script>const PAGE_PAGE = ${type}</script>
  </head>
  <body>
    <div id="root"></div>
  </body>
  <script type="module" src=${js} nonce=${nonce}></script>
</html>`;
  }
}
