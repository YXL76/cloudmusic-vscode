import { ACCOUNT_STATE, resolveAnotherSongItem, resolveSongItem } from "./helper.js";
import { API_CACHE, LYRIC_CACHE } from "../../cache.js";
import { eapiRequest, weapiRequest } from "./request.js";
import { API_CONFIG } from "../helper.js";
import type { NeteaseTopSongType } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import { STATE } from "../../state.js";
import { logError } from "../../utils.js";

const parseLyric = (raw: string): readonly (readonly [number, string])[] => {
  const unsorted: Array<[number, string]> = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    const r = /^((\[\d+:\d{2}[.:]\d{2,3}\])+)(.*)$/g.exec(line.trim());
    if (!r) {
      try {
        const { t, c } = JSON.parse(line) as { t: number; c: { tx: string }[] };
        unsorted.push([t / 1000, c.map(({ tx }) => tx).join("")]);
      } catch {}
      continue;
    }
    const text = r[3]?.trim() ?? "";
    let t = r[1];
    while (t) {
      const r = /^\[(\d+):(\d{2})[.:](\d{2,3})\](.*)$/g.exec(t);
      if (!r) break;
      const minute = parseInt(r[1]);
      const second = parseInt(r[2]);
      const millisecond = parseInt(r[3].length === 2 ? `${r[3]}0` : r[3]);
      unsorted.push([minute * 60 + second + millisecond / 1000, text]);
      t = r[4];
    }
  }

  unsorted.sort(([a], [b]) => a - b);

  const ret = [];
  const len = unsorted.length;
  for (let i = 0; i < len; ++i) {
    const [time, text] = unsorted[i];
    if (text) ret.push(<const>[time, text]);
  }
  return ret;
};

const parseLyricUser = (user?: NeteaseTypings.LyricUser): NeteaseTypings.LyricUser | undefined =>
  user ? { nickname: user.nickname, userid: user.userid } : undefined;

export async function lyric(id: number): Promise<NeteaseTypings.LyricData> {
  const lyricCache = await LYRIC_CACHE.get(`${id}`);
  if (lyricCache) return lyricCache;

  const res = await eapiRequest<{
    lrc?: { version: number; lyric?: string };
    klyric?: { version: number; lyric?: string };
    tlyric?: { version: number; lyric?: string };
    romalrc?: { version: number; lyric?: string };
    yrc?: { version: number; lyric?: string };
    ytlrc?: { version: number; lyric?: string };
    yromalrc?: { version: number; lyric?: string };
    lyricUser?: NeteaseTypings.LyricUser;
    transUser?: NeteaseTypings.LyricUser;
  }>(
    "interface3.music.163.com/eapi/song/lyric/v1",
    {
      id,
      cp: false,
      tv: 0,
      lv: 0,
      rv: 0,
      kv: 0,
      yv: 0,
      ytv: 0,
      yrv: 0,
    },
    "/api/song/lyric/v1",
  );

  if (!res) return { time: [0], text: [["~", "~", "~"]], user: [] };

  const user = <[NeteaseTypings.LyricUser?, NeteaseTypings.LyricUser?]>[
    parseLyricUser(res.lyricUser),
    parseLyricUser(res.transUser),
  ];

  const o = parseLyric(res?.lrc?.lyric ?? "");
  if (!o.length) return { time: [0], text: [["~", "~", "~"]], user: [] };

  const t = parseLyric(res?.tlyric?.lyric ?? "");
  const r = parseLyric(res?.romalrc?.lyric ?? "");

  const time = o.map(([t]) => t);
  const text = o.map(([, t]) => <[string, string, string]>[t, "", ""]);

  let i = 0;
  outer: for (const [ttime, ttext] of t) {
    if (time[i] > ttime) continue;
    while (time[i] < ttime) if (++i >= time.length) break outer;
    if (time[i] === ttime) text[i][1] = ttext;
    if (++i >= time.length) break;
  }

  i = 0;
  outer: for (const [rtime, rtext] of r) {
    if (time[i] > rtime) continue;
    while (time[i] < rtime) if (++i >= time.length) break outer;
    if (time[i] === rtime) text[i][2] = rtext;
    if (++i >= time.length) break;
  }

  // Interval greater than 8s
  // FIXME: is it necessary? And we can't modify array while iterating it
  /* for (let j = 1; j < time.length; ++j) {
    const i = j - 1;
    const interval = time[j] - time[i];
    if (interval > 8) {
      time.splice(j, 0, time[i] + interval / 4);
      text.splice(j, 0, ["~"] as [string]);
    }
  } */

  type Lyric = NeteaseTypings.LyricData & { ctime: number };
  const lyric: Lyric = { ctime: Date.now(), time, text, user };

  LYRIC_CACHE.put(`${id}`, lyric);
  return lyric;
}

export async function simiSong(
  songid: number,
  limit: number,
  offset: number,
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = `simi_song${songid}-${limit}-${offset}`;
  const value = API_CACHE.get<readonly NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    songs: readonly NeteaseTypings.AnotherSongItem[];
  }>("music.163.com/weapi/v1/discovery/simiSong", { songid, limit, offset });
  if (!res) return [];
  const ret = res.songs.map(resolveAnotherSongItem);
  API_CACHE.set(key, ret);
  return ret;
}

export async function songDetail(
  uid: number,
  trackIds: readonly number[],
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = `song_detail${trackIds[0]}`;
  if (trackIds.length === 1) {
    const value = API_CACHE.get<readonly NeteaseTypings.SongsItem[]>(key);
    if (value) return value;
  }

  const limit = 1000;
  const tasks: Promise<readonly NeteaseTypings.SongsItem[]>[] = [];
  for (let i = 0; i < trackIds.length; i += limit) {
    const ids = trackIds.slice(i, i + limit);
    tasks.push(
      (async (): Promise<readonly NeteaseTypings.SongsItem[]> => {
        const res = await weapiRequest<{
          songs: readonly NeteaseTypings.SongsItem[];
          privileges: readonly { st: number }[];
        }>(
          "music.163.com/weapi/v3/song/detail",
          { c: `[${ids.map((id) => `{"id":${id}}`).join(",")}]` },
          ACCOUNT_STATE.cookies.get(uid),
        );
        if (!res) throw Error;
        const { songs, privileges } = res;
        return songs.filter((_, i) => privileges[i].st >= 0).map(resolveSongItem);
      })(),
    );
  }
  try {
    const ret = (await Promise.all(tasks)).flat();
    if (trackIds.length === 1) API_CACHE.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

const br2level = new Map([
  [128000, "standard"],
  [192000, "higher"],
  [320000, "exhigh"],
  [999000, "lossless"],
]);

export async function songUrl(id: number): Promise<NeteaseTypings.SongDetail> {
  type SongUrlItem = NeteaseTypings.SongDetail & { freeTrialInfo?: { start: number; end: number } };

  for (const [, cookie] of ACCOUNT_STATE.cookies) {
    try {
      const rurl = `${API_CONFIG.protocol}://interface.music.163.com/eapi/song/enhance/player/url/v1`;

      const value = await eapiRequest<{
        readonly data: ReadonlyArray<SongUrlItem>;
      }>(
        "interface.music.163.com/eapi/song/enhance/player/url/v1",
        { ids: `[${id}]`, level: br2level.get(STATE.musicQuality) ?? "standard", encodeType: "flac" },
        "/api/song/enhance/player/url/v1",
        cookie,
      );
      if (!value) throw Error();

      if (value.cookie) for (const c of value.cookie) cookie.setCookieSync(c, rurl);

      const [{ url, md5, type, freeTrialInfo }] = value.data;
      if (!freeTrialInfo) return { url, md5, type };
    } catch (err) {
      logError(err);
    }

    try {
      const value = await eapiRequest<{ readonly data: SongUrlItem }>(
        "interface.music.163.com/eapi/song/enhance/download/url",
        { id, br: STATE.musicQuality },
        "/api/song/enhance/download/url",
        cookie,
      );
      if (!value) throw Error();
      const { url, md5, type, freeTrialInfo } = value.data;
      if (!freeTrialInfo) return { url, md5, type };
    } catch (err) {
      logError(err);
    }
  }
  return <NeteaseTypings.SongDetail>{};
}

export async function topSong(areaId: NeteaseTopSongType): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = `top_song${areaId}`;
  const value = API_CACHE.get<readonly NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    data: readonly NeteaseTypings.AnotherSongItem[];
  }>("music.163.com/weapi/v1/discovery/new/songs", {
    areaId, // 全部:0 华语:7 欧美:96 日本:8 韩国:16
    // limit: query.limit || 100,
    // offset: query.offset || 0,
    total: true,
  });
  if (!res) return [];
  const ret = res.data.map(resolveAnotherSongItem);
  API_CACHE.set(key, ret);
  return ret;
}
