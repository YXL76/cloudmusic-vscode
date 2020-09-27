import { ColorThemeKind, Uri, ViewColumn, env, window } from "vscode";
import {
  MultiStepInput,
  apiUserRecord,
  pickAlbum,
  pickArtist,
  pickSong,
} from "../util";
import type { SongsItem } from "../constant";
import type { WebviewPanel } from "vscode";
import { i18n } from "../i18n";

export class WebView {
  private static instance: WebView;

  constructor(
    private readonly jsUri: Uri,
    private readonly cssUri: Uri,
    private readonly lightCssUri: Uri,
    private readonly darkCssUri: Uri,
    private readonly iconUri: Uri
  ) {}

  static initInstance(extensionUri: Uri): WebView {
    return (this.instance = new WebView(
      Uri.joinPath(extensionUri, "dist", "index.js"),
      Uri.joinPath(extensionUri, "dist", "index.css"),
      Uri.joinPath(extensionUri, "dist", "antd.min.css"),
      Uri.joinPath(extensionUri, "dist", "antd.dark.min.css"),
      Uri.joinPath(extensionUri, "media", "icon.ico")
    ));
  }

  static getInstance(): WebView {
    return this.instance;
  }

  userMusicRankingList(): WebviewPanel {
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
    panel.webview.onDidReceiveMessage(
      async (message: { command: string; item: SongsItem; id: number }) => {
        const { command } = message;
        if (command === "refresh") {
          void panel.webview.postMessage(await apiUserRecord(true));
        } else if (command === "song") {
          const { item } = message;
          void MultiStepInput.run((input) => pickSong(input, 1, item));
        } else if (command === "album") {
          const { id } = message;
          void MultiStepInput.run((input) => pickAlbum(input, 1, id));
        } else if (command === "artist") {
          const { id } = message;
          void MultiStepInput.run((input) => pickArtist(input, 1, id));
        }
      }
    );
    return panel;
  }

  private getWebviewPanel(
    entry: "userMusicRankingList",
    title: string,
    data: {
      i18n?: Record<string, string>;
      message?: unknown;
    } = {}
  ): WebviewPanel {
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

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
