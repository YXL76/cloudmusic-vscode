import {
  AccountState,
  resolveAnotherSongItem,
  resolveSongItem,
} from "./helper";
import { LyricCache, apiCache } from "../../cache";
import { apiRequest, eapiRequest, weapiRequest } from "./request";
import type { NeteaseTopSongType } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import { State } from "../../state";
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

  const res = await apiRequest<{
    lrc?: { lyric?: string };
    tlyric?: { lyric?: string };
    romalrc?: { lyric?: string };
    lyricUser?: NeteaseTypings.LyricUser;
    transUser?: NeteaseTypings.LyricUser;
  }>(
    "music.163.com/api/song/lyric?_nmclfl=1",
    { id: `${id}`, tv: "-1", lv: "-1", rv: "-1", kv: "-1" },
    { os: "ios" }
  );

  if (!res) return { time: [0], text: [["~"]], user: [] };

  const o = parseLyric(res?.lrc?.lyric ?? "");
  const t = parseLyric(res?.tlyric?.lyric ?? "");
  const user = [
    parseLyricUser(res.lyricUser),
    parseLyricUser(res.transUser),
  ] as [NeteaseTypings.LyricUser?, NeteaseTypings.LyricUser?];

  // Combine origin and translation
  let oidx = 0;
  let tidx = 0;
  const time = [];
  const text = [];
  while (oidx < o.length && tidx < t.length) {
    const [otime, otext] = o[oidx];
    const [ttime, ttext] = t[tidx];
    if (otime === ttime) {
      time.push(otime);
      text.push([otext, ttext] as [string, string]);
      ++oidx;
      ++tidx;
    } else if (otime < ttime) {
      time.push(otime);
      text.push([otext] as [string]);
      ++oidx;
    } else ++tidx; // Just drop the text
  }

  while (oidx < o.length) {
    const [otime, otext] = o[oidx++];
    time.push(otime);
    text.push([otext] as [string]);
  }
  while (tidx < t.length) {
    const [ttime, ttext] = t[tidx];
    time.push(ttime);
    text.push([ttext] as [string]);
  }

  const len = time.length;
  if (len === 0) {
    time.push(0);
    text.push(["~"] as [string]);
  } else {
    // Interval greater than 8s
    // FIXME: is it necessary? And we can't modify array while iterating it
    /* for (let j = 1; j < len; ++j) {
      const i = j - 1;
      const interval = time[j] - time[i];
      if (interval > 8) {
        time.splice(j, 0, time[i] + interval / 4);
        text.splice(j, 0, ["~"] as [string]);
      }
    } */
  }

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
  }>("music.163.com/weapi/v1/discovery/simiSong", {
    songid: `${songid}`,
    limit: `${limit}`,
    offset: `${offset}`,
  });
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
        if (!res) throw new Error("");
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

export async function songUrl(id: string): Promise<NeteaseTypings.SongDetail> {
  type SongUrlItem = NeteaseTypings.SongDetail & {
    freeTrialInfo?: { start: number; end: number };
  };
  type SongUrlResponse = {
    readonly data: ReadonlyArray<SongUrlItem>;
  };
  type DownloadUrlResponse = {
    readonly data: SongUrlItem;
  };

  for (const [, cookie] of AccountState.cookies) {
    const [i, j] = (await Promise.allSettled([
      eapiRequest<SongUrlResponse>(
        "interface3.music.163.com/eapi/song/enhance/player/url",
        { ids: `[${id}]`, br: `${State.musicQuality}` },
        "/api/song/enhance/player/url",
        { ...cookie, os: "pc" }
      ),
      eapiRequest<DownloadUrlResponse>(
        "interface.music.163.com/eapi/song/enhance/download/url",
        { id, br: `${State.musicQuality}` },
        "/api/song/enhance/download/url",
        cookie
      ),
    ])) as [
      PromiseSettledResult<SongUrlResponse>,
      PromiseSettledResult<DownloadUrlResponse>
    ];
    if (i.status === "fulfilled" && i.value.data) {
      const [{ url, md5, type, freeTrialInfo }] = i.value.data;
      if (!freeTrialInfo) return { url, md5, type };
    }
    if (j.status === "fulfilled" && j.value.data) {
      const { url, md5, type, freeTrialInfo } = j.value.data;
      if (!freeTrialInfo) return { url, md5, type };
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
    areaId: `${areaId}`, // 全部:0 华语:7 欧美:96 日本:8 韩国:16
    // limit: query.limit || 100,
    // offset: query.offset || 0,
    total: "true",
  });
  if (!res) return [];
  const ret = res.data.map(resolveAnotherSongItem);
  apiCache.set(key, ret);
  return ret;
}
