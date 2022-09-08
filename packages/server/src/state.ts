import type { NeteaseTypings } from "api";

export const STATE = {
  foreign: process.env["CM_FOREIGN"] === "1",
  minSize: 256 * 1024,
  cacheSize: parseInt(<string>process.env["CM_MUSIC_CACHE_SIZE"]),
  musicQuality: parseInt(<string>process.env["CM_MUSIC_QUALITY"]),
  lyric: <NeteaseTypings.LyricData & { delay: number; idx: number }>{
    delay: -1.0,
    idx: 0,
    time: [0],
    text: [["~", "~", "~"]],
    user: [],
  },
};
