import { Comment, Tabs } from "../components";
import type { CommentRet, webview } from "@cloudmusic/shared";
import React, { useState } from "react";
import i18n from "../i18n";
import { request } from "../utils";

export type CommentListProps = {
  titles: string[];
} & CommentRet;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const CommentList = ({
  titles,
  hasMore,
  totalCount,
  comments,
}: CommentListProps): JSX.Element => {
  const [state, setState] = useState({
    comments,
    hasMore,
    totalCount,
    index: 0,
  });

  return (
    <>
      <div className="w-full p-3">
        <Tabs
          title={`${i18n.word.comment} (${state.totalCount})`}
          titles={titles}
          selectd={state.index}
          switchTab={async (index) => {
            const list = await request<CommentRet, webview.CommentCSMsg>({
              command: "tabs",
              index,
            });
            setState({ ...state, ...list, index });
          }}
        />
        {state.comments.map((comment, key) => (
          <Comment key={key} {...comment} />
        ))}
      </div>
      <div className="flex justify-center mb-6">
        {
          <button
            className="cursor-pointer mr-4 p-2 rounded-md bg-transparent text-lg text-blue-600 border-solid border-2 border-blue-600 focus:outline-none"
            onClick={async () => {
              const list = await request<CommentRet, webview.CommentCSMsg>({
                command: "prev",
              });
              setState({ ...state, ...list });
            }}
          >
            {i18n.word.previousPage}
          </button>
        }
        {hasMore && (
          <button
            className="cursor-pointer ml-4 p-2 rounded-md bg-transparent text-lg text-blue-600 border-solid border-2 border-blue-600 focus:outline-none"
            onClick={async () => {
              const list = await request<CommentRet, webview.CommentCSMsg>({
                command: "next",
              });
              setState({ ...state, ...list });
            }}
          >
            {i18n.word.nextPage}
          </button>
        )}
      </div>
    </>
  );
};
