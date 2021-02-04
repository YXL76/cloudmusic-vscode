export * from "./components";

import { ColorThemeKind, Uri, ViewColumn, window } from "vscode";
import { MultiStepInput, pickAlbum, pickArtist, pickSong } from "../util";
import {
  apiLoginQrCheck,
  apiLoginQrKey,
  apiSongDetail,
  apiUserRecord,
} from "../api";
import { AccountManager } from "../manager";
import Login from "./login";
import MusicRanking from "./musicRanking";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { h } from "preact";
import i18n from "../i18n";
import render from "preact-render-to-string";
import { resolve } from "path";
import { toDataURL } from "qrcode";
/** @jsx h */

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

  private static readonly iconUri = Uri.file(
    resolve(__dirname, "..", "media", "icon.ico")
  );

  static async login(): Promise<void> {
    const key = await apiLoginQrKey();
    if (!key) return;
    const imgSrc = await toDataURL(
      `https://music.163.com/login?codekey=${key}`
    );
    const main = <Login imgSrc={imgSrc} />;
    const { panel, setHtml } = this.getPanel(i18n.word.signIn, getNonce());

    const timer = setInterval(
      () =>
        void apiLoginQrCheck(key).then((code) => {
          if (code === 803) {
            panel.dispose();
            void AccountManager.login();
            void window.showInformationMessage(i18n.sentence.success.signIn);
          } else if (code === 800) {
            panel.dispose();
            void window.showErrorMessage(i18n.sentence.fail.signIn);
          }
        }),
      512
    );
    panel.onDidDispose(() => clearInterval(timer));

    setHtml(main);
  }

  static async musicRanking(): Promise<void> {
    const nonce = getNonce();
    const [weekData, allData] = await apiUserRecord();
    const weekView = <MusicRanking record={weekData} index={0} nonce={nonce} />;
    const allView = <MusicRanking record={allData} index={1} nonce={nonce} />;
    const { panel, setHtml } = this.getPanel(i18n.word.musicRanking, nonce);

    type RecvMessage = {
      command: "tab" | "song" | "album" | "artist";
      id: number;
    };
    panel.webview.onDidReceiveMessage(({ command, id }: RecvMessage) => {
      switch (command) {
        case "tab":
          setHtml(id === 0 ? weekView : allView);
          break;
        case "song":
          void MultiStepInput.run(async (input) =>
            pickSong(input, 1, (await apiSongDetail([id]))[0])
          );
          break;
        case "album":
          void MultiStepInput.run((input) => pickAlbum(input, 1, id));
          break;
        case "artist":
          void MultiStepInput.run((input) => pickArtist(input, 1, id));
          break;
      }
    });

    setHtml(weekView);
  }

  static commentList(/* type: CommentType, gid: number, title: string */): void {
    /* const pageSize = 30;

    const panel = this.getPanel(`${i18n.word.comment} (${title})`); */
  }

  private static getPanel(title: string, nonce: string) {
    const panel = window.createWebviewPanel(
      "cloudmusic",
      title,
      ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    panel.iconPath = this.iconUri;
    const css = panel.webview.asWebviewUri(this.cssUri).toString();
    return {
      panel,
      setHtml: (main: h.JSX.Element) =>
        (panel.webview.html = `<!DOCTYPE html>${this.layout(
          title,
          main,
          css,
          nonce
        )}`),
    };
  }

  private static layout(
    title: string,
    main: h.JSX.Element,
    cssHref: string,
    nonce: string
  ) {
    return render(
      <html
        lang="en"
        className={
          window.activeColorTheme.kind === ColorThemeKind.Light ? "" : "dark"
        }
      >
        <head>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>{title}</title>
          <link rel="stylesheet" type="text/css" href={cssHref} />
        </head>
        <body>
          <script nonce={nonce}>const vscode = acquireVsCodeApi()</script>
          {main}
        </body>
      </html>
    );
  }
}
