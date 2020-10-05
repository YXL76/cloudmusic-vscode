export type SongsItem = {
  name: string;
  id: number;
  dt: number;
  alia: string[];
  ar: { id: number; name: string }[];
  al: { id: number; name: string; picUrl: string };
};

export type RecordData = SongsItem & { playCount: number };

export type UserDetail = {
  userId: number;
  nickname: string;
  signature: string;
  followeds: number;
  follows: number;
  avatarUrl: string;
};

export type CommentDetail = {
  user: UserDetail;
  commentId: number;
  content: string;
  time: number;
  likedCount: number;
  liked: boolean;
  replyCount: number;
  beReplied?: {
    beRepliedCommentId: number;
    content: string;
    user: UserDetail;
  };
};
