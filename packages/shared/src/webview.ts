import type { CSMessage } from "./index";
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
  | { command: "lyric"; text: NeteaseTypings.LyricData["text"] }
  | { command: "index"; idx: number };

export type MusicRankingCMsg =
  | CSMessage<{ command: "song"; id: number }, undefined>
  | CSMessage<{ command: "album"; id: number }, undefined>
  | CSMessage<{ command: "artist"; id: number }, undefined>;

export type ProviderCMsg =
  | { command: "pageLoaded" }
  | { command: "toggle" }
  | { command: "previous" }
  | { command: "next" }
  | { command: "account"; userId: number }
  | { command: "end" }
  | { command: "load" }
  | { command: "position"; pos: number }
  | { command: "playing"; playing: boolean };

export type ProviderSMsg =
  | { command: "master"; is: boolean }
  | { command: "state"; state: "none" | "paused" | "playing" }
  | {
      command: "metadata";
      duration?: number;
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
  | { command: "speed"; speed: number }
  | { command: "volume"; level: number };
