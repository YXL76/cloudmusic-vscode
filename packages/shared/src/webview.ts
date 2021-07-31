import type { CSMessage } from ".";
import type { NeteaseTypings } from "api";

export type WebviewType =
  | "comment"
  | "login"
  | "description"
  | "lyric"
  | "musicRanking";

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

export type ProviderSMsg =
  | { command: "master"; is: boolean }
  | { command: "state"; state: "none" | "paused" | "playing" }
  // | { command: "position"; position: number }
  | {
      command: "metadata";
      // duration?: number;
      title?: string;
      artist?: string;
      album?: string;
      artwork?: { src: string; sizes?: string; type?: string }[];
    }
  | { command: "account"; profiles: NeteaseTypings.Profile[] }
  | { command: "load"; url: string }
  | { command: "play" }
  | { command: "pause" }
  | { command: "stop" }
  | { command: "volume"; level: number };
