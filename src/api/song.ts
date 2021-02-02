import type { AnotherSongItem, SongDetail, SongsItem } from "../constant";
import { LyricCache, apiCache } from "../util";
import { MUSIC_QUALITY, UNLOCK_MUSIC, unplayable } from "../constant";
import {
  apiRequest,
  eapiRequest,
  solveAnotherSongItem,
  solveSongItem,
  weapiRequest,
} from ".";
import type { TopSongType } from ".";
import unlock from "../unlock";

export async function apiLyric(id: number) {
  const lyricCache = await LyricCache.get(`${id}`);
  if (lyricCache) {
    return lyricCache;
  }
  const time = [0];
  const text = ["Lyric"];
  try {
    const {
      lrc: { lyric },
    } = await apiRequest<{ lrc: { lyric: string } }>(
      "https://music.163.com/api/song/lyric",
      {
        id,
        lv: -1,
        kv: -1,
        tv: -1,
      }
    );
    const lines = lyric.split("\n");
    let prev = 0;
    for (const line of lines) {
      const r = /^\[(\d{2,}):(\d{2})(?:[\.\:](\d{2,3}))?](.*)$/g.exec(
        line.trim()
      );
      if (r) {
        const minute = parseInt(r[1]);
        const second = parseInt(r[2]);
        const millisecond = parseInt(r[3]) * (r[3].length === 2 ? 10 : 1);
        const txt = r[4];
        const current = minute * 60 + second + millisecond / 1000;
        if (current >= prev) {
          prev = current;
          time.push(current);
          text.push(txt || "Lyric");
        }
      }
    }

    LyricCache.put(`${id}`, { time, text });
  } catch {}
  return { time, text };
}

export async function apiSimiSong(
  songid: number,
  limit: number,
  offset: number
) {
  const key = `simi_song${songid}-${limit}-${offset}`;
  const value = apiCache.get<SongsItem[]>(key);
  if (value) return value;
  try {
    const { songs } = await weapiRequest<{ songs: AnotherSongItem[] }>(
      "https://music.163.com/weapi/v1/discovery/simiSong",
      { songid, limit, offset }
    );
    const ret = songs.map(solveAnotherSongItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiSongDetail(trackIds: number[]) {
  const key = `song_detail${trackIds[0]}`;
  if (trackIds.length === 1) {
    const value = apiCache.get<SongsItem[]>(key);
    if (value) return value;
  }
  const limit = 1000;
  const tasks: Promise<SongsItem[]>[] = [];
  for (let i = 0; i < trackIds.length; i += limit) {
    const ids = trackIds.slice(i, i + limit);
    tasks.push(
      new Promise((resolve, reject) => {
        weapiRequest<{
          songs: SongsItem[];
          privileges: { st: number }[];
        }>("https://music.163.com/weapi/v3/song/detail", {
          c: `[${ids.map((id) => `{"id":${id}}`).join(",")}]`,
          ids: `[${ids.join(",")}]`,
        })
          .then(({ songs, privileges }) => {
            if (UNLOCK_MUSIC.enabled) {
              for (let i = 0; i < privileges.length; ++i) {
                if (privileges[i].st < 0) {
                  unplayable.add(songs[i].id);
                }
              }
              resolve(songs.map(solveSongItem));
            }
            const ret: SongsItem[] = [];
            for (let i = 0; i < privileges.length; ++i) {
              if (privileges[i].st >= 0) {
                ret.push(solveSongItem(songs[i]));
              }
            }
            resolve(ret);
          })
          .catch(reject);
      })
    );
  }
  try {
    const ret = (await Promise.all(tasks)).flat();
    if (trackIds.length === 1) {
      apiCache.set(key, ret);
    }
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiSongUrl(song: SongsItem) {
  try {
    if (UNLOCK_MUSIC.enabled && unplayable.has(song.id)) {
      const data = await unlock(song);
      if (data) {
        return data;
      }
      return {} as Partial<SongDetail>;
    }
    const { data } = await eapiRequest<{ data: SongDetail[] }>(
      "https://interface3.music.163.com/eapi/song/enhance/player/url",
      {
        ids: `[${song.id}]`,
        br: MUSIC_QUALITY,
      },
      "/api/song/enhance/player/url",
      "pc"
    );
    const { url, md5, type } = data[0];

    return { url, md5, type };
  } catch (err) {
    console.error(err);
  }
  return {} as Partial<SongDetail>;
}

export async function apiTopSong(areaId: TopSongType) {
  const key = `top_song${areaId}`;
  const value = apiCache.get<SongsItem[]>(key);
  if (value) return value;
  try {
    const { data } = await weapiRequest<{ data: AnotherSongItem[] }>(
      "https://music.163.com/weapi/v1/discovery/new/songs",
      {
        areaId, // 全部:0 华语:7 欧美:96 日本:8 韩国:16
        // limit: query.limit || 100,
        // offset: query.offset || 0,
        total: true,
      }
    );
    const ret = data.map(solveAnotherSongItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}
