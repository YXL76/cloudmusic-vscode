import type { CSMessage } from ".";

export const enum Type {
  comment,
  login,
  description,
  lyric,
  musicRanking,
}

export type CommentCSMsg =
  | { command: "init" }
  | { command: "prev" }
  | { command: "next" }
  | { command: "tabs"; index: number }
  | { command: "like"; id: number; t: "unlike" | "like" };

export type CommentCMsg = CSMessage<{ command: "user"; id: number }, undefined>;
/* | CSMessage<{ command: "reply"; id: number }, undefined>
  | CSMessage<{ command: "floor"; id: number }, undefined> */

export type LyricSMsg =
  | {
      command: "lyric";
      data: { otext: string; ttext: string };
    }
  | { command: "size"; data: number };

export type MsicRankingCMsg =
  | CSMessage<{ command: "song"; id: number }, undefined>
  | CSMessage<{ command: "album"; id: number }, undefined>
  | CSMessage<{ command: "artist"; id: number }, undefined>;
