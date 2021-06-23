///<reference types="@types/vscode-webview"/>

import type { CommentCSMsg, WebviewType } from "@cloudmusic/shared";
import { CommentList, Description, Login, Lyric, MusicRanking } from "./pages";
import type { CommentListProps, DescriptionProps, LoginProps } from "./pages";
import { request, startEventListener } from "./utils";
import type { NeteaseTypings } from "api";
import React from "react";
import { render } from "react-dom";

declare const PAGE_PAGE: WebviewType;

const root = document.getElementById("root");

(async () => {
  switch (PAGE_PAGE) {
    case "comment":
      {
        startEventListener();
        const props = await request<CommentListProps, CommentCSMsg>({
          command: "init",
        });
        render(<CommentList {...props} />, root);
      }
      break;
    case "description":
      {
        startEventListener();
        const props = await request<DescriptionProps>(undefined);
        render(<Description {...props} />, root);
      }
      break;
    case "login":
      {
        startEventListener();
        const props = await request<LoginProps>(undefined);
        render(<Login {...props} />, root);
      }
      break;
    case "lyric":
      render(<Lyric />, root);
      break;
    case "musicRanking":
      {
        startEventListener();
        const record = await request<
          ReadonlyArray<readonly NeteaseTypings.RecordData[]>
        >(undefined);
        render(
          <MusicRanking
            record={record}
            max={record.map(
              (i) =>
                i.reduce((pre, { playCount }) => Math.max(pre, playCount), 0) /
                100
            )}
          />,
          root
        );
      }
      break;
  }
})().catch(console.error);
