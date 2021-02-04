import * as React from "react";
import * as dayjs from "dayjs";
import * as relativeTime from "dayjs/plugin/relativeTime";
import { RawScript, Tabs } from ".";
import type { CommentDetail } from "../constant";
import { FiThumbsUp } from "react-icons/fi";
import i18n from "../i18n";

dayjs.extend(relativeTime);

type CommentProps = CommentDetail;

// eslint-disable-next-line @typescript-eslint/naming-convention
const Comment = ({
  user,
  content,
  commentId,
  time,
  likedCount,
  liked,
  replyCount,
  beReplied,
}: CommentProps) => (
  <div
    className="comment box-border w-full my-4 rounded-xl bg-black bg-opacity-20 shadow-md flex flex-row p-4 overflow-hidden"
    data-id={commentId}
  >
    <img
      className="user cursor-pointer rounded-full h-16 w-16"
      src={user.avatarUrl}
      alt={user.nickname}
      data-id={user.userId}
    />
    <div className="flex-1 ml-4 text-base">
      <div>
        <div
          className="user cursor-pointer inline-block text-blue-600 text-lg"
          data-id={user.userId}
        >
          {user.nickname}
        </div>
        <div className="inline-block ml-4 text-sm">{dayjs(time).fromNow()}</div>
      </div>
      <div className="mt-1">{content}</div>
      {beReplied && (
        <div className="text-base mt-1 ml-2 border-solid border-l-4 border-blue-600">
          <div
            className="user cursor-pointer inline-block text-blue-600"
            data-id={beReplied.user.userId}
          >
            @{beReplied.user.nickname}
          </div>
          : {beReplied.content}
        </div>
      )}
      <div className="mt-1">
        <div className="inline-block">
          <div
            className="like cursor-pointer inline-block"
            data-t={liked ? "unlike" : "like"}
          >
            <FiThumbsUp size={13} color={liked ? "#2563EB" : undefined} />
          </div>
          <div className="inline-block ml-2">{likedCount}</div>
        </div>
        <div className="reply cursor-pointer inline-block ml-6">
          {i18n.word.reply}
        </div>
        {replyCount > 0 && (
          <div className="floor cursor-pointer inline-block text-blue-600 ml-6">
            {replyCount} {i18n.word.reply}
            {" >"}
          </div>
        )}
      </div>
    </div>
  </div>
);

interface CommentListProps {
  titles: string[];
  firstPage: boolean;
  hasMore: boolean;
  totalCount: number;
  comments: CommentDetail[];
  nonce: string;
  index: number;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const CommentList = ({
  titles,
  firstPage,
  hasMore,
  totalCount,
  comments,
  nonce,
  index,
}: CommentListProps): JSX.Element => {
  return (
    <>
      <div className="box-border w-screen py-4 pl-4 pr-12">
        <Tabs
          className="mb-4"
          title={`${i18n.word.comment} (${totalCount})`}
          titles={titles}
          selectd={index}
        />
        {comments.map((comment, key) => (
          <Comment key={key} {...comment} />
        ))}
      </div>
      <div className="flex justify-center mb-6">
        {!firstPage && (
          <button
            id="prev"
            className="cursor-pointer mr-4 p-2 rounded-md bg-transparent text-lg text-blue-600 border-solid border-2 border-blue-600 focus:outline-none"
          >
            {i18n.word.previousPage}
          </button>
        )}
        {hasMore && (
          <button
            id="next"
            className="cursor-pointer ml-4 p-2 rounded-md bg-transparent text-lg text-blue-600 border-solid border-2 border-blue-600 focus:outline-none"
          >
            {i18n.word.nextPage}
          </button>
        )}
      </div>
      <RawScript content={GLOBAL_COMMENT} nonce={nonce} />
    </>
  );
};

export default CommentList;
