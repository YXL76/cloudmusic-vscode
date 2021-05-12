import { LyricCache, State, apiCache, logError } from "../..";
import { apiRequest, eapiRequest, weapiRequest } from "./request";
import { resolveAnotherSongItem, resolveSongItem } from "./helper";
import type { NeteaseEnum } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";

const resolveLyric = (raw: string): { time: number[]; text: string[] } => {
  const unsorted: Array<[number, string]> = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    const r = /^\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))\](.*)$/g.exec(line.trim());
    if (!r) continue;
    const minute = parseInt(r[1]);
    const second = parseInt(r[2]);
    const millisecond = parseInt(r[3].length === 2 ? `${r[3]}0` : r[3]);
    unsorted.push([minute * 60 + second + millisecond / 1000, r[4] ?? ""]);
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
    if (unsorted[j][0] - time > 4) {
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

  try {
    const { lrc, tlyric, lyricUser, transUser } = await apiRequest<{
      lrc: { lyric: string };
      tlyric: { lyric: string };
      lyricUser?: NeteaseTypings.LyricUser;
      transUser?: NeteaseTypings.LyricUser;
    }>("https://music.163.com/api/song/lyric", { id, lv: -1, kv: -1, tv: -1 });

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
  } catch {}
  return {
    o: { time: [0], text: ["~"] },
    t: { time: [0], text: ["~"] },
  };
}

export async function simiSong(
  songid: number,
  limit: number,
  offset: number
): Promise<NeteaseTypings.SongsItem[]> {
  const key = `simi_song${songid}-${limit}-${offset}`;
  const value = apiCache.get<NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  try {
    const { songs } = await weapiRequest<{
      songs: NeteaseTypings.AnotherSongItem[];
    }>("https://music.163.com/weapi/v1/discovery/simiSong", {
      songid,
      limit,
      offset,
    });
    const ret = songs.map(resolveAnotherSongItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function songDetail(
  trackIds: number[]
): Promise<NeteaseTypings.SongsItem[]> {
  const key = `song_detail${trackIds[0]}`;
  if (trackIds.length === 1) {
    const value = apiCache.get<NeteaseTypings.SongsItem[]>(key);
    if (value) return value;
  }

  const limit = 1000;
  const tasks: Promise<NeteaseTypings.SongsItem[]>[] = [];
  for (let i = 0; i < trackIds.length; i += limit) {
    const ids = trackIds.slice(i, i + limit);
    tasks.push(
      (async () => {
        const { songs, privileges } = await weapiRequest<{
          songs: NeteaseTypings.SongsItem[];
          privileges: { st: number }[];
        }>("https://music.163.com/weapi/v3/song/detail", {
          c: `[${ids.map((id) => `{"id":${id}}`).join(",")}]`,
        });
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
  try {
    const { data } = await eapiRequest<{
      data: (NeteaseTypings.SongDetail & {
        freeTrialInfo?: { start: number; end: number };
      })[];
    }>(
      "https://interface3.music.163.com/eapi/song/enhance/player/url",
      { ids: `[${id}]`, br: State.musicQuality },
      "/api/song/enhance/player/url",
      "pc"
    );
    const [{ url, md5, type }] = data;

    // if (freeTrialInfo) {}
    return { url, md5, type };
  } catch (err) {
    logError(err);
  }
  return {} as NeteaseTypings.SongDetail;
}

export async function topSong(
  areaId: NeteaseEnum.TopSongType
): Promise<NeteaseTypings.SongsItem[]> {
  const key = `top_song${areaId}`;
  const value = apiCache.get<NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  try {
    const { data } = await weapiRequest<{
      data: NeteaseTypings.AnotherSongItem[];
    }>("https://music.163.com/weapi/v1/discovery/new/songs", {
      areaId, // 全部:0 华语:7 欧美:96 日本:8 韩国:16
      // limit: query.limit || 100,
      // offset: query.offset || 0,
      total: true,
    });
    const ret = data.map(resolveAnotherSongItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}
