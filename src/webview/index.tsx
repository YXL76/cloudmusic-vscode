export * from "./components";

import * as React from "react";
import { ColorThemeKind, Uri, ViewColumn, window } from "vscode";
import {
  MultiStepInput,
  pickAlbum,
  pickArtist,
  pickSong,
  pickUser,
} from "../util";
import {
  SortType,
  apiCommentFloor,
  apiCommentLike,
  apiCommentNew,
  apiLoginQrCheck,
  apiLoginQrKey,
  apiSongDetail,
  apiUserRecord,
} from "../api";
import { AccountManager } from "../manager";
import CommentList from "./comment";
import { CommentType } from "../api";
import Login from "./login";
import MusicRanking from "./musicRanking";
import i18n from "../i18n";
import { renderToStaticMarkup } from "react-dom/server";
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
    const { panel, setHtml } = this.getPanel(i18n.word.signIn);

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
    const htmls = [
      <MusicRanking key={0} record={weekData} index={0} nonce={nonce} />,
      <MusicRanking key={1} record={allData} index={1} nonce={nonce} />,
    ];
    const { panel, setHtml } = this.getPanel(i18n.word.musicRanking);

    type RecvMessage = {
      command: "tab" | "song" | "album" | "artist";
      id: number;
    };
    panel.webview.onDidReceiveMessage(({ command, id }: RecvMessage) => {
      switch (command) {
        case "tab":
          setHtml(htmls[id]);
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

    setHtml(htmls[0]);
  }

  static async comment(
    type: CommentType,
    gid: number,
    title: string
  ): Promise<void> {
    const pageSize = 30;
    const nonce = getNonce();

    const sortTypes = [
      ...(type === CommentType.dj ? [] : [SortType.recommendation]),
      SortType.hottest,
      SortType.latest,
    ];
    const titles = [
      ...(type === CommentType.dj ? [] : [i18n.word.recommendation]),
      i18n.word.hottest,
      i18n.word.latest,
    ];

    const getList = async (
      pageNo: number,
      sortType: SortType,
      cursor: number
    ) => await apiCommentNew(type, gid, pageNo, pageSize, sortType, cursor);

    let time = 0;
    const list = async (index: number, pageNo: number, cursor: number) => {
      const data = await getList(pageNo, sortTypes[index], cursor);
      time = data.comments[data.comments.length - 1]?.time || 0;
      return (
        <CommentList
          titles={titles}
          index={index}
          nonce={nonce}
          firstPage={pageNo === 1}
          {...data}
        />
      );
    };

    let index = 0;
    let pageNo = 1;
    const main = await list(index, pageNo, time);
    const { panel, setHtml } = this.getPanel(`${i18n.word.comment} (${title})`);

    type Message = {
      command: "like" | "list" | "user" | "prev" | "next" | "floor" | "reply";
      id: number;
      t: "like" | "unlike";
    };

    let busy = false;
    panel.webview.onDidReceiveMessage(async ({ command, id, t }: Message) => {
      if (busy) return;
      busy = true;
      switch (command) {
        case "like":
          if (await apiCommentLike(type, t, gid, id))
            setHtml(await list(index, pageNo, time));
          break;
        case "list":
          index = id;
          pageNo = 1;
          setHtml(await list(index, pageNo, time));
          break;
        case "user":
          void MultiStepInput.run((input) => pickUser(input, 1, id));
          break;
        case "prev":
          --pageNo;
          if (index === sortTypes.length - 1) time = 0;
          setHtml(await list(index, pageNo, time));
          break;
        case "next":
          ++pageNo;
          setHtml(await list(index, pageNo, time));
          break;
        case "floor":
          await apiCommentFloor(type, gid, id, pageSize, time);
          break;
        case "reply":
          break;
      }
      busy = false;
    });

    setHtml(main);
  }

  private static getPanel(title: string) {
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
      setHtml: (main: JSX.Element) =>
        (panel.webview.html = `<!DOCTYPE html>${this.layout(
          title,
          main,
          css
        )}`),
    };
  }

  private static layout(title: string, main: JSX.Element, cssHref: string) {
    return renderToStaticMarkup(
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
        <body className="overflow-x-hidden">{main}</body>
      </html>
    );
  }
}
