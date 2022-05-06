import { Comment, Tabs } from "../components";
import React, { useState } from "react";
import type { CommentCSMsg } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import i18n from "../i18n";
import { request } from "../utils";

export type CommentListProps = {
  titles: readonly string[];
} & NeteaseTypings.CommentRet;

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
          switchTab={(index) => {
            request<NeteaseTypings.CommentRet, CommentCSMsg>({
              command: "tabs",
              index,
            })
              .then((list) => setState({ ...state, ...list, index }))
              .catch(console.error);
          }}
        />
        {state.comments.map((comment) => (
          <Comment key={comment.commentId} {...comment} />
        ))}
      </div>
      <div className="flex justify-center mb-6">
        {
          <button
            className="cursor-pointer mr-4 p-2 rounded-md bg-transparent text-lg text-blue-600 border-solid border-2 border-blue-600 focus:outline-none"
            onClick={() => {
              request<NeteaseTypings.CommentRet, CommentCSMsg>({
                command: "prev",
              })
                .then((list) => setState({ ...state, ...list }))
                .catch(console.error);
            }}
          >
            {i18n.word.previousPage}
          </button>
        }
        {hasMore && (
          <button
            className="cursor-pointer ml-4 p-2 rounded-md bg-transparent text-lg text-blue-600 border-solid border-2 border-blue-600 focus:outline-none"
            onClick={() => {
              request<NeteaseTypings.CommentRet, CommentCSMsg>({
                command: "next",
              })
                .then((list) => setState({ ...state, ...list }))
                .catch(console.error);
            }}
          >
            {i18n.word.nextPage}
          </button>
        )}
      </div>
    </>
  );
};
