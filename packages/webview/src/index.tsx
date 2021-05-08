import type { CommentCSMsg, RecordData, WebviewType } from "@cloudmusic/shared";
import { CommentList, Description, Login, Lyric, MusicRanking } from "./pages";
import type { CommentListProps, DescriptionProps, LoginProps } from "./pages";
import React from "react";
import { render } from "react-dom";
import { request } from "./utils";

declare const PAGE_PAGE: WebviewType;

const root = document.getElementById("root");

(async () => {
  switch (PAGE_PAGE) {
    case "comment":
      {
        const props = await request<CommentListProps, CommentCSMsg>({
          command: "init",
        });
        render(<CommentList {...props} />, root);
      }
      break;
    case "description":
      {
        const props = await request<DescriptionProps>(undefined);
        render(<Description {...props} />, root);
      }
      break;
    case "login":
      {
        const props = await request<LoginProps>(undefined);
        render(<Login {...props} />, root);
      }
      break;
    case "lyric":
      render(<Lyric />, root);
      break;
    case "musicRanking":
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
