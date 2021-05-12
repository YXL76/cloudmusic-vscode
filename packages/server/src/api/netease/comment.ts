import { eapiRequest, weapiRequest } from "./request";
import { NeteaseEnum } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import { logError } from "../..";
import { resolveComment } from "./helper";

const resourceTypeMap = [
  "R_SO_4_",
  "R_MV_5_",
  "A_PL_0_",
  "R_AL_3_",
  "A_DJ_1_",
  "R_VI_62_",
  "A_EV_2_",
];

export async function commentAdd(
  type: NeteaseEnum.CommentType,
  id: number,
  content: string
): Promise<boolean> {
  try {
    await weapiRequest(
      `https://music.163.com/weapi/resource/comments/add`,
      { threadId: `${resourceTypeMap[type]}${id}`, content },
      { os: "pc" }
    );
    return true;
  } catch (err) {
    logError(err);
  }
  return false;
}

export async function commentReply(
  type: NeteaseEnum.CommentType,
  id: number,
  content: string,
  commentId: number
): Promise<boolean> {
  try {
    await weapiRequest(
      `https://music.163.com/weapi/resource/comments/reply`,
      { threadId: `${resourceTypeMap[type]}${id}`, content, commentId },
      { os: "pc" }
    );
    return true;
  } catch (err) {
    logError(err);
  }
  return false;
}

export async function commentFloor(
  type: NeteaseEnum.CommentType,
  id: number,
  parentCommentId: number,
  limit: number,
  time: number
): Promise<NeteaseTypings.CommentRet> {
  try {
    const {
      data: { totalCount, hasMore, comments },
    } = await weapiRequest<{
      data: {
        totalCount: number;
        hasMore: boolean;
        comments: NeteaseTypings.RawCommentDetail[];
      };
    }>("https://music.163.com/api/resource/comment/floor/get", {
      parentCommentId,
      threadId: `${resourceTypeMap[type]}${id}`,
      time,
      limit,
    });
    return {
      totalCount,
      hasMore,
      comments: comments.map(resolveComment),
    };
  } catch (err) {
    logError(err);
  }
  return { totalCount: 0, hasMore: false, comments: [] };
}

export async function commentLike(
  type: NeteaseEnum.CommentType,
  t: "like" | "unlike",
  id: number,
  commentId: number
): Promise<boolean> {
  try {
    await weapiRequest(
      `https://music.163.com/weapi/v1/comment/${t}`,
      { threadId: `${resourceTypeMap[type]}${id}`, commentId },
      { os: "pc" }
    );
    return true;
  } catch (err) {
    logError(err);
  }
  return false;
}

export async function commentNew(
  type: NeteaseEnum.CommentType,
  id: number,
  pageNo: number,
  pageSize: number,
  sortType: NeteaseEnum.SortType,
  cursor: number
): Promise<NeteaseTypings.CommentRet> {
  try {
    const {
      data: { totalCount, hasMore, comments },
    } = await eapiRequest<{
      data: {
        totalCount: number;
        hasMore: boolean;
        comments: NeteaseTypings.RawCommentDetail[];
      };
    }>(
      "https://music.163.com/api/v2/resource/comments",
      {
        threadId: `${resourceTypeMap[type]}${id}`,
        pageNo,
        showInner: true,
        pageSize,
        cursor:
          sortType === NeteaseEnum.SortType.latest
            ? cursor
            : (pageNo - 1) * pageSize,
        sortType,
      },
      "/api/v2/resource/comments",
      "pc"
    );
    return {
      totalCount,
      hasMore,
      comments: comments.map(resolveComment),
    };
  } catch (err) {
    logError(err);
  }
  return { totalCount: 0, hasMore: false, comments: [] };
}
