import { LyricCache, State, apiCache } from "../..";
import { apiRequest, eapiRequest, weapiRequest } from "./request";
import { resolveAnotherSongItem, resolveSongItem } from "./helper";
import type { NeteaseEnum } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";

const resolveLyric = (raw: string): { time: number[]; text: string[] } => {
  const time = [];
  const text = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    const r = /^\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))\](.*)$/g.exec(line.trim());
    if (r) {
      const minute = parseInt(r[1]);
      const second = parseInt(r[2]);
      const millisecond = parseInt(r[3].length === 2 ? `${r[3]}0` : r[3]);
      time.push((minute * 60 + second) * 1000 + millisecond);
      text.push(r[4] || "~");
    }
  }
  return { time, text };
};

const resolveLyricUser = (
  user?: NeteaseTypings.LyricUser
): NeteaseTypings.LyricUser | undefined =>
  user ? { nickname: user.nickname, userid: user.userid } : undefined;

export async function lyric(id: number): Promise<NeteaseTypings.LyricData> {
  const lyricCache = await LyricCache.get(`${id}`);
  if (lyricCache) return lyricCache;
  const lyric: NeteaseTypings.LyricData = {
    ctime: Date.now(),
    time: [0],
    o: { text: ["~"] },
    t: { text: ["~"] },
  };

  try {
    const { lrc, tlyric, lyricUser, transUser } = await apiRequest<{
      lrc: { lyric: string };
      tlyric: { lyric: string };
      lyricUser?: NeteaseTypings.LyricUser;
      transUser?: NeteaseTypings.LyricUser;
    }>("https://music.163.com/api/song/lyric", { id, lv: -1, kv: -1, tv: -1 });

    lyric.o.user = resolveLyricUser(lyricUser);
    lyric.t.user = resolveLyricUser(transUser);
    const o = resolveLyric(lrc.lyric);
    const t = resolveLyric(tlyric.lyric);

    if (t.text.length === 0) {
      lyric.time = [0, ...o.time];
      lyric.o.text = ["~", ...o.text];
      lyric.t.text = ["~", ...o.text];
    } else {
      let i = 0;
      let j = 0;
      while (i < o.time.length && j < t.time.length) {
        const otime = o.time[i];
        const otext = o.text[i] || "~";
        const ttime = t.time[j];
        const ttext = t.text[j] || "~";
        lyric.time.push(Math.min(otime, ttime));
        if (otime === ttime) {
          lyric.o.text.push(otext);
          ++i;
          lyric.t.text.push(ttext);
          ++j;
        } else if (otime < ttime) {
          lyric.o.text.push(otext);
          ++i;
          lyric.t.text.push(lyric.t.text[j]);
        } else if (otime > ttime) {
          lyric.o.text.push(lyric.o.text[i]);
          lyric.t.text.push(ttext);
          ++j;
        }
      }
    }

    LyricCache.put(`${id}`, lyric);
    return lyric;
  } catch {}
  return lyric;
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
    console.error(err);
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
    console.error(err);
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
    console.error(err);
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
    console.error(err);
  }
  return [];
}
