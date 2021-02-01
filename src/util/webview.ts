import { ColorThemeKind, Uri, ViewColumn, env, window } from "vscode";
import { MultiStepInput, pickAlbum, pickArtist, pickSong, pickUser } from ".";
import {
  SortType,
  apiCommentAdd,
  apiCommentFloor,
  apiCommentLike,
  apiCommentNew,
  apiCommentReply,
  apiLoginQrCheck,
  apiLoginQrKey,
  apiUserRecord,
} from "../api";
import { AccountManager } from "../manager";
import type { CommentType } from "../api";
import type { SongsItem } from "../constant";
import { i18n } from "../i18n";
import { toDataURL } from "qrcode";

export class WebView {
  private static instance: WebView;

  constructor(
    private readonly jsUri: Uri,
    private readonly cssUri: Uri,
    private readonly lightCssUri: Uri,
    private readonly darkCssUri: Uri,
    private readonly iconUri: Uri
  ) {}

  static initInstance(extensionUri: Uri) {
    this.instance = new WebView(
      Uri.joinPath(extensionUri, "dist", "webview.js"),
      Uri.joinPath(extensionUri, "dist", "webview.css"),
      Uri.joinPath(extensionUri, "dist", "antd.min.css"),
      Uri.joinPath(extensionUri, "dist", "antd.dark.min.css"),
      Uri.joinPath(extensionUri, "media", "icon.ico")
    );
  }

  static getInstance() {
    return this.instance;
  }

  async login() {
    const key = await apiLoginQrKey();
    if (!key) return;

    const imgSrc = await toDataURL(
      `https://music.163.com/login?codekey=${key}`
    );

    const panel = window.createWebviewPanel(
      "cloudmusic",
      i18n.word.signIn,
      ViewColumn.One,
      { retainContextWhenHidden: true }
    );

    panel.iconPath = this.iconUri;

    panel.webview.html = `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${i18n.word.signIn}</title>
  <style>
    #root {
      height: 100vh;
      width: 100vw;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #qrcode {
      height: 256px;
      width: 256px;
    }
  </style>
</head>

<body>
  <div id="root">
    <img id="qrcode" src="${imgSrc}"/>
  </div>
</body>

</html>`;

    const timer = setInterval(() => {
      apiLoginQrCheck(key)
        .then((code) => {
          if (code === 803) {
            panel.dispose();
            void AccountManager.login();
            void window.showInformationMessage(i18n.sentence.success.signIn);
          } else if (code === 800) {
            panel.dispose();
            void window.showErrorMessage(i18n.sentence.fail.signIn);
          }
        })
        .catch(() => {});
    }, 512);

    panel.onDidDispose(() => {
      clearInterval(timer);
    });
  }

  userMusicRankingList() {
    const panel = this.getWebviewPanel(
      "userMusicRankingList",
      i18n.word.userRankingList,
      {
        i18n: {
          allTime: i18n.word.allTime,
          refresh: i18n.word.refresh,
          refreshing: i18n.word.refreshing,
          weekly: i18n.word.weekly,
        },
      }
    );
    void (async () => {
      void panel.webview.postMessage(await apiUserRecord());
    })();

    type RecvMessage = {
      command: "refresh" | "song" | "album" | "artist";
      item: SongsItem;
      id: number;
    };
    panel.webview.onDidReceiveMessage(
      async ({ command, item, id }: RecvMessage) => {
        switch (command) {
          case "refresh":
            void panel.webview.postMessage(await apiUserRecord(true));
            break;
          case "song":
            void MultiStepInput.run((input) => pickSong(input, 1, item));
            break;
          case "album":
            void MultiStepInput.run((input) => pickAlbum(input, 1, id));
            break;
          case "artist":
            void MultiStepInput.run((input) => pickArtist(input, 1, id));
        }
      }
    );
    return panel;
  }

  commentList(type: CommentType, gid: number, title: string) {
    const pageSize = 30;

    const panel = this.getWebviewPanel(
      "commentList",
      `${i18n.word.comment} (${title})`,
      {
        i18n: {
          comment: i18n.word.comment,
          recommendation: i18n.word.recommendation,
          hottest: i18n.word.hottest,
          latest: i18n.word.latest,
          reply: i18n.word.reply,
          more: i18n.word.more,
          submit: i18n.word.submit,
        },
        message: { pageSize },
      }
    );

    async function list(pageNo: number, sortType: SortType, time: number) {
      void panel.webview.postMessage({
        command: "list",
        sortType,
        ...(await apiCommentNew(type, gid, pageNo, pageSize, sortType, time)),
      });
    }

    void list(1, SortType.recommendation, 0);

    type Message = {
      command: "user" | "list" | "like" | "reply" | "floor";
      id: number;
      sortType: SortType;
      pageNo: number;
      cid: number;
      pid: number;
      t: "like" | "unlike";
      content: string;
      time: number;
    };

    panel.webview.onDidReceiveMessage(
      ({
        command,
        id,
        pageNo,
        sortType,
        time,
        cid,
        t,
        content,
        pid,
      }: Message) => {
        switch (command) {
          case "user":
            void MultiStepInput.run((input) => pickUser(input, 1, id));
            break;
          case "list":
            if (sortType === SortType.latest) {
              void list(pageNo, sortType, time);
            } else {
              void list(pageNo, sortType, 0);
            }
            break;
          case "like":
            void apiCommentLike(type, t, gid, cid).then((res) => {
              if (res) {
                void panel.webview.postMessage({
                  command: "like",
                  liked: t === "like" ? true : false,
                  cid,
                });
              }
            });
            break;
          case "reply":
            if (cid === 0) {
              void apiCommentAdd(type, gid, content);
            } else {
              void apiCommentReply(type, gid, content, cid);
            }
            break;
          case "floor":
            void apiCommentFloor(type, gid, pid, pageSize, time).then(
              (data) =>
                void panel.webview.postMessage({ command: "floor", ...data })
            );
        }
      }
    );
    return panel;
  }

  private getWebviewPanel(
    entry: "userMusicRankingList" | "commentList",
    title: string,
    data: {
      i18n?: Record<string, string>;
      message?: unknown;
    } = {}
  ) {
    const panel = window.createWebviewPanel(
      "cloudmusic",
      title,
      ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.iconPath = this.iconUri;
    const js = panel.webview.asWebviewUri(this.jsUri);
    const css = panel.webview.asWebviewUri(this.cssUri);
    const antdCss = panel.webview.asWebviewUri(
      window.activeColorTheme.kind === ColorThemeKind.Light
        ? this.lightCssUri
        : this.darkCssUri
    );

    const nonce = getNonce();

    panel.webview.html = `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="${antdCss.toString()}">
  <link rel="stylesheet" type="text/css" href="${css.toString()}">
</head>

<body>
  <script nonce="${nonce}">
    window.webview = {
      vscode: acquireVsCodeApi(),
      entry: "${entry}",
      language: "${env.language}",
      data: ${JSON.stringify(data)},
    }
  </script>
  <div id="root"></div>
  <script nonce="${nonce}" src="${js.toString()}"></script>
</body>

</html>`;

    return panel;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
