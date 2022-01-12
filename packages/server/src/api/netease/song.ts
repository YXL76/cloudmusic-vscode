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

const resolveLyric = (raw: string): readonly (readonly [number, string])[] => {
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

const resolveLyricUser = (
  user?: NeteaseTypings.LyricUser
): NeteaseTypings.LyricUser | undefined =>
  user ? { nickname: user.nickname, userid: user.userid } : undefined;

export async function lyric(id: number): Promise<NeteaseTypings.LyricData> {
  const lyricCache = await LyricCache.get(`${id}`);
  if (lyricCache) return lyricCache;

  const res = await apiRequest<{
    lrc?: { lyric?: string };
    tlyric?: { lyric?: string };
    lyricUser?: NeteaseTypings.LyricUser;
    transUser?: NeteaseTypings.LyricUser;
  }>("music.163.com/api/song/lyric", { id, lv: -1, kv: -1, tv: -1 });

  if (!res) return { time: [0], text: [["~"]], user: [] };

  const o = resolveLyric(res?.lrc?.lyric ?? "");
  const t = resolveLyric(res?.tlyric?.lyric ?? "");
  const user = [
    resolveLyricUser(res.lyricUser),
    resolveLyricUser(res.transUser),
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
        { ids: `[${id}]`, br: State.musicQuality },
        "/api/song/enhance/player/url",
        { ...cookie, os: "pc" }
      ),
      eapiRequest<DownloadUrlResponse>(
        "interface.music.163.com/eapi/song/enhance/download/url",
        { id, br: State.musicQuality },
        "/api/song/enhance/download/url",
        cookie
      ),
    ])) as [
      PromiseSettledResult<SongUrlResponse>,
      PromiseSettledResult<DownloadUrlResponse>
    ];
    if (i.status === "fulfilled") {
      const [{ url, md5, type, freeTrialInfo }] = i.value.data;
      if (!freeTrialInfo) return { url, md5, type };
    }
    if (j.status === "fulfilled") {
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
