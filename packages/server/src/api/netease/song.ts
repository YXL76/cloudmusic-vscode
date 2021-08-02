import {
  AccountState,
  resolveAnotherSongItem,
  resolveSongItem,
} from "./helper";
import { LyricCache, apiCache } from "../../cache";
import { apiRequest, eapiRequest, weapiRequest } from "./request";
import type { NeteaseEnum } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import { State } from "../../state";
import { logError } from "../../utils";

const resolveLyric = (
  raw: string
): { time: readonly number[]; text: readonly string[] } => {
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

  const ti = [0];
  const te = ["~"];
  const len = unsorted.length;
  for (let i = 0; i < len; ++i) {
    const [time, text] = unsorted[i];
    if (text) {
      ti.push(time);
      te.push(text);
      continue;
    }
    let j = i + 1;
    if (j >= len) break;
    while (j < len && !unsorted[j][1]) ++j;
    if (j >= len || unsorted[j][0] - time > 4) {
      ti.push(time);
      te.push("~");
    }
    i = j - 1;
  }
  return { time: ti, text: te };
};

const resolveLyricUser = (
  user?: NeteaseTypings.LyricUser
): NeteaseTypings.LyricUser | undefined =>
  user ? { nickname: user.nickname, userid: user.userid } : undefined;

export async function lyric(id: number): Promise<NeteaseTypings.LyricData> {
  const lyricCache = await LyricCache.get(`${id}`);
  if (lyricCache) return lyricCache;

  const res = await apiRequest<{
    lrc: { lyric: string };
    tlyric: { lyric: string };
    lyricUser?: NeteaseTypings.LyricUser;
    transUser?: NeteaseTypings.LyricUser;
  }>("music.163.com/api/song/lyric", { id, lv: -1, kv: -1, tv: -1 });

  if (!res)
    return {
      o: { time: [0], text: ["~"] },
      t: { time: [0], text: ["~"] },
    };

  const { lrc, tlyric, lyricUser, transUser } = res;

  const o = resolveLyric(lrc.lyric);
  const t = resolveLyric(tlyric.lyric);
  const lyric: NeteaseTypings.LyricData & { ctime: number } = {
    ctime: Date.now(),
    o,
    t: t.text.length < 3 ? o : t,
  };

  lyric.o.user = resolveLyricUser(lyricUser);
  lyric.t.user = resolveLyricUser(transUser);

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
        if (!res) throw Error("");
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
  for (const [, cookie] of AccountState.cookies) {
    const res = await eapiRequest<{
      data: readonly (NeteaseTypings.SongDetail & {
        freeTrialInfo?: { start: number; end: number };
      })[];
    }>(
      "interface3.music.163.com/eapi/song/enhance/player/url",
      { ids: `[${id}]`, br: State.musicQuality },
      "/api/song/enhance/player/url",
      { ...cookie, os: "pc" }
    );
    if (!res) continue;
    const [{ url, md5, type, freeTrialInfo }] = res.data;
    if (!freeTrialInfo) return { url, md5, type };
  }
  return {} as NeteaseTypings.SongDetail;
}

export async function topSong(
  areaId: NeteaseEnum.TopSongType
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
