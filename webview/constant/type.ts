export type SongsItem = {
  name: string;
  id: number;
  dt: number;
  alia: string[];
  ar: { id: number; name: string }[];
  al: { id: number; name: string; picUrl: string };
};

export type RecordData = SongsItem & { playCount: number };

export type SimplyUserDetail = {
  userId: number;
  nickname: string;
  avatarUrl: string;
};

export type CommentDetail = {
  user: SimplyUserDetail;
  commentId: number;
  content: string;
  time: number;
  likedCount: number;
  liked: boolean;
  replyCount: number;
  beReplied?: {
    beRepliedCommentId: number;
    content: string;
    user: SimplyUserDetail;
  };
};
