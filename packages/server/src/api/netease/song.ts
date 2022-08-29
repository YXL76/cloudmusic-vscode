import {
  AccountState,
  OS_IOS_COOKIE,
  OS_PC_COOKIE,
  resolveAnotherSongItem,
  resolveSongItem,
} from "./helper";
import { LyricCache, apiCache } from "../../cache";
import { apiRequest, eapiRequest, weapiRequest } from "./request";
import { APISetting } from "../helper";
import { CookieJar } from "tough-cookie";
import type { NeteaseTopSongType } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import { STATE } from "../../state";
import { logError } from "../../utils";

const parseLyric = (raw: string): readonly (readonly [number, string])[] => {
  const unsorted: Array<[number, string]> = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    const r = /^((\[\d+:\d{2}[.:]\d{2,3}\])+)(.*)$/g.exec(line.trim());
    if (!r) continue;
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
    if (text) ret.push([time, text] as const);
  }
  return ret;
};

const parseLyricUser = (
  user?: NeteaseTypings.LyricUser
): NeteaseTypings.LyricUser | undefined =>
  user ? { nickname: user.nickname, userid: user.userid } : undefined;

export async function lyric(id: number): Promise<NeteaseTypings.LyricData> {
  const lyricCache = await LyricCache.get(`${id}`);
  if (lyricCache) return lyricCache;

  const tmpJar = AccountState.defaultCookie.cloneSync();
  const url = `${APISetting.apiProtocol}://music.163.com/api/song/lyric?_nmclfl=1`;
  tmpJar.setCookieSync(OS_IOS_COOKIE, url);

  const res = await apiRequest<{
    lrc?: { lyric?: string };
    tlyric?: { lyric?: string };
    romalrc?: { lyric?: string };
    lyricUser?: NeteaseTypings.LyricUser;
    transUser?: NeteaseTypings.LyricUser;
  }>(
    "music.163.com/api/song/lyric?_nmclfl=1",
    { id, tv: -1, lv: -1, rv: -1, kv: -1 },
    tmpJar
  );

  if (!res) return { time: [0], text: [["~", "~", "~"]], user: [] };

  const user = [
    parseLyricUser(res.lyricUser),
    parseLyricUser(res.transUser),
  ] as [NeteaseTypings.LyricUser?, NeteaseTypings.LyricUser?];

  const o = parseLyric(res?.lrc?.lyric ?? "");
  if (!o.length) return { time: [0], text: [["~", "~", "~"]], user: [] };

  const t = parseLyric(res?.tlyric?.lyric ?? "");
  const r = parseLyric(res?.romalrc?.lyric ?? "");

  const time = o.map(([t]) => t);
  const text = o.map(([, t]) => [t, "", ""] as [string, string, string]);

  let i = 0;
  outer: for (const [ttime, ttext] of t) {
    if (time[i] > ttime) continue;
    while (time[i] < ttime) {
      if (++i >= time.length) break outer;
    }
    if (time[i] === ttime) text[i][1] = ttext;
    if (++i >= time.length) break;
  }

  i = 0;
  outer: for (const [rtime, rtext] of r) {
    if (time[i] > rtime) continue;
    while (time[i] < rtime) {
      if (++i >= time.length) break outer;
    }
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

  LyricCache.put(`${id}`, lyric);
  return lyric;
}

export async function simiSong(
  songid: number,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = `simi_song${songid}-${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    songs: readonly NeteaseTypings.AnotherSongItem[];
  }>("music.163.com/weapi/v1/discovery/simiSong", { songid, limit, offset });
  if (!res) return [];
  const ret = res.songs.map(resolveAnotherSongItem);
  apiCache.set(key, ret);
  return ret;
}

export async function songDetail(
  uid: number,
  trackIds: readonly number[]
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = `song_detail${trackIds[0]}`;
  if (trackIds.length === 1) {
    const value = apiCache.get<readonly NeteaseTypings.SongsItem[]>(key);
    if (value) return value;
  }

  const limit = 1000;
  const tasks: Promise<readonly NeteaseTypings.SongsItem[]>[] = [];
  for (let i = 0; i < trackIds.length; i += limit) {
    const ids = trackIds.slice(i, i + limit);
    tasks.push(
      (async () => {
        const res = await weapiRequest<{
          songs: readonly NeteaseTypings.SongsItem[];
          privileges: readonly { st: number }[];
        }>(
          "music.163.com/weapi/v3/song/detail",
          { c: `[${ids.map((id) => `{"id":${id}}`).join(",")}]` },
          AccountState.cookies.get(uid)
        );
        if (!res) throw Error;
        const { songs, privileges } = res;
        return songs
          .filter((_, i) => privileges[i].st >= 0)
          .map(resolveSongItem);
      })()
    );
  }
  try {
    const ret = (await Promise.all(tasks)).flat();
    if (trackIds.length === 1) apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

const br2level = new Map([
  [128000, "standard"],
  [192000, "standard"],
  [320000, "exhigh"],
  [999000, "lossless"],
]);

export async function songUrl(id: string): Promise<NeteaseTypings.SongDetail> {
  type SongUrlItem = NeteaseTypings.SongDetail & {
    freeTrialInfo?: { start: number; end: number };
  };

  for (const [uid, cookie] of AccountState.cookies) {
    try {
      const tmpJar = cookie.cloneSync();
      const rurl = `${APISetting.apiProtocol}://interface.music.163.com/eapi/song/enhance/player/url/v1`;
      tmpJar.setCookieSync(OS_PC_COOKIE, rurl);

      AccountState.eapiCookies
        .get(uid)
        ?.getCookiesSync(rurl)
        .forEach((c) => tmpJar.setCookieSync(c, rurl));

      const value = await eapiRequest<{
        readonly data: ReadonlyArray<SongUrlItem>;
      }>(
        "interface.music.163.com/eapi/song/enhance/player/url/v1",
        {
          ids: `[${id}]`,
          level: br2level.get(STATE.musicQuality) ?? "standard",
          encodeType: "flac",
        },
        "/api/song/enhance/player/url/v1",
        tmpJar
      );
      if (!value) throw Error();

      if (value.cookie) {
        const jar = AccountState.eapiCookies.get(uid) ?? new CookieJar();
        for (const c of value.cookie) jar.setCookieSync(c, rurl);
        AccountState.eapiCookies.set(uid, jar);
      }
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
        cookie
      );
      if (!value) throw Error();
      const { url, md5, type, freeTrialInfo } = value.data;
      if (!freeTrialInfo) return { url, md5, type };
    } catch (err) {
      logError(err);
    }
  }
  return {} as NeteaseTypings.SongDetail;
}

export async function topSong(
  areaId: NeteaseTopSongType
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = `top_song${areaId}`;
  const value = apiCache.get<readonly NeteaseTypings.SongsItem[]>(key);
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
  apiCache.set(key, ret);
  return ret;
}
