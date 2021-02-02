import type { CommentDetail, RawCommentDetail } from "../constant";
import {
  SortType,
  eapiRequest,
  resourceTypeMap,
  solveComment,
  weapiRequest,
} from ".";
import type { CommentType } from ".";
import { apiCache } from "../util";

export async function apiCommentAdd(
  type: CommentType,
  id: number,
  content: string
) {
  try {
    await weapiRequest(
      `https://music.163.com/weapi/resource/comments/add`,
      { threadId: `${resourceTypeMap[type]}${id}`, content },
      "pc"
    );
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiCommentReply(
  type: CommentType,
  id: number,
  content: string,
  commentId: number
) {
  try {
    await weapiRequest(
      `https://music.163.com/weapi/resource/comments/reply`,
      { threadId: `${resourceTypeMap[type]}${id}`, content, commentId },
      "pc"
    );
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiCommentFloor(
  type: CommentType,
  id: number,
  parentCommentId: number,
  limit: number,
  time: number
) {
  const key = `comment_floor${type}-${id}-${parentCommentId}-${limit}-${time}`;
  const value = apiCache.get<{
    totalCount: number;
    hasMore: boolean;
    comments: CommentDetail[];
  }>(key);
  if (value) return value;
  try {
    const {
      data: { totalCount, hasMore, comments },
    } = await weapiRequest<{
      data: {
        totalCount: number;
        hasMore: boolean;
        comments: RawCommentDetail[];
      };
    }>("https://music.163.com/api/resource/comment/floor/get", {
      parentCommentId,
      threadId: `${resourceTypeMap[type]}${id}`,
      time,
      limit,
    });
    const ret = {
      totalCount,
      hasMore,
      comments: comments.map(solveComment),
    };
    apiCache.set(key, ret, 60);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return { totalCount: 0, hasMore: false, comments: [] };
}

export async function apiCommentLike(
  type: CommentType,
  t: "like" | "unlike",
  id: number,
  commentId: number
) {
  try {
    await weapiRequest(
      `https://music.163.com/weapi/v1/comment/${t}`,
      { threadId: `${resourceTypeMap[type]}${id}`, commentId },
      "pc"
    );
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiCommentNew(
  type: CommentType,
  id: number,
  pageNo: number,
  pageSize: number,
  sortType: SortType,
  cursor: number
) {
  const key = `comment_new${type}-${id}-${pageNo}-${pageSize}-${sortType}-${cursor}`;
  const value = apiCache.get<{
    totalCount: number;
    hasMore: boolean;
    comments: CommentDetail[];
  }>(key);
  if (value) return value;
  try {
    const {
      data: { totalCount, hasMore, comments },
    } = await eapiRequest<{
      data: {
        totalCount: number;
        hasMore: boolean;
        comments: RawCommentDetail[];
      };
    }>(
      "https://music.163.com/api/v2/resource/comments",
      {
        threadId: `${resourceTypeMap[type]}${id}`,
        pageNo,
        showInner: true,
        pageSize,
        cursor: sortType === SortType.latest ? cursor : (pageNo - 1) * pageSize,
        sortType,
      },
      "/api/v2/resource/comments",
      "pc"
    );
    const ret = {
      totalCount,
      hasMore,
      comments: comments.map(solveComment),
    };
    if (sortType !== SortType.latest || cursor !== 0) {
      apiCache.set(key, ret, 60);
    }
    return ret;
  } catch (err) {
    console.error(err);
  }
  return { totalCount: 0, hasMore: false, comments: [] };
}
