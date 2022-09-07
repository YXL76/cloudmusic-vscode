import { Comment, Tabs } from "../components";
import { useCallback, useState } from "react";
import type { CommentCSMsg } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import i18n from "../i18n";
import { request } from "../utils";

export type CommentListProps = {
  titles: readonly string[];
  list: NeteaseTypings.CommentRet;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const CommentList = ({ titles, list }: CommentListProps): JSX.Element => {
  const [index, setIndex] = useState(0);
  const [state, setState] = useState(list);

  const previousAction = useCallback(() => {
    request<{ list: NeteaseTypings.CommentRet }, CommentCSMsg>({ command: "prev" })
      .then(({ list }) => setState(list))
      .catch(console.error);
  }, []);
  const nextAction = useCallback(() => {
    request<{ list: NeteaseTypings.CommentRet }, CommentCSMsg>({ command: "next" })
      .then(({ list }) => setState(list))
      .catch(console.error);
  }, []);

  return (
    <>
      <div className="w-full p-3">
        <Tabs
          title={`${i18n.word.comment} (${state.totalCount})`}
          titles={titles}
          selectd={index}
          switchTab={(index) => {
            request<{ list: NeteaseTypings.CommentRet }, CommentCSMsg>({ command: "tabs", index })
              .then(({ list }) => {
                setIndex(index);
                setState(list);
              })
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
            onClick={previousAction}
          >
            {i18n.word.previousPage}
          </button>
        }
        {state.hasMore && (
          <button
            className="cursor-pointer ml-4 p-2 rounded-md bg-transparent text-lg text-blue-600 border-solid border-2 border-blue-600 focus:outline-none"
            onClick={nextAction}
          >
            {i18n.word.nextPage}
          </button>
        )}
      </div>
    </>
  );
};
