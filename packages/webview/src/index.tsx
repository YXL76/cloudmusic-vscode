import { CommentList, Description, Login, Lyric, MusicRanking } from "./pages";
import type { CommentListProps, DescriptionProps, LoginProps } from "./pages";
import React from "react";
import type { RecordData } from "@cloudmusic/shared";
import { render } from "react-dom";
import { request } from "./utils";
import { webview } from "@cloudmusic/shared";

declare const PAGE_PAGE: webview.Type;

const root = document.getElementById("root");

(async () => {
  switch (PAGE_PAGE) {
    case webview.Type.comment:
      {
        const props = await request<CommentListProps, webview.CommentCSMsg>({
          command: "init",
        });
        render(<CommentList {...props} />, root);
      }
      break;
    case webview.Type.description:
      {
        const props = await request<DescriptionProps>(undefined);
        render(<Description {...props} />, root);
      }
      break;
    case webview.Type.login:
      {
        const props = await request<LoginProps>(undefined);
        render(<Login {...props} />, root);
      }
      break;
    case webview.Type.lyric:
      render(<Lyric />, root);
      break;
    case webview.Type.musicRanking:
      {
        const record = await request<RecordData[][]>(undefined);
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
