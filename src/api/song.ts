import type {
  AnotherSongItem,
  LyricData,
  SongDetail,
  SongsItem,
} from "../constant";
import { LyricCache, apiCache } from "../util";
import {
  eapiRequest,
  linuxRequest,
  solveAnotherSongItem,
  solveSongItem,
  weapiRequest,
} from ".";
import { MUSIC_QUALITY } from "../constant";
import type { TopSongType } from ".";

export async function apiLyric(id: number): Promise<LyricData> {
  const lyricCache = await LyricCache.get(`${id}`);
  if (lyricCache) {
    return lyricCache;
  }
  const time: number[] = [0];
  const text: string[] = ["Lyric"];
  try {
    const {
      lrc: { lyric },
    } = await linuxRequest<{ lrc: { lyric: string } }>(
      "https://music.163.com/api/song/lyric",
      {
        id,
        lv: -1,
        kv: -1,
        tv: -1,
      },
      "pc"
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
  } catch (err) {
    console.error(err);
  }
  return { time, text };
}

export async function apiSimiSong(
  songid: number,
  limit: number,
  offset: number
): Promise<SongsItem[]> {
  const key = `simi_song${songid}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as SongsItem[];
  }
  try {
    const { songs } = await weapiRequest<{ songs: AnotherSongItem[] }>(
      "https://music.163.com/weapi/v1/discovery/simiSong",
      { songid, limit, offset }
    );
    const ret = songs.map((song) => solveAnotherSongItem(song));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiSongDetail(trackIds: number[]): Promise<SongsItem[]> {
  const key = `song_detail${trackIds[0]}`;
  if (trackIds.length === 1) {
    const value = apiCache.get(key);
    if (value) {
      return value as SongsItem[];
    }
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

export async function apiSongUrl(trackIds: number[]): Promise<SongDetail[]> {
  const limit = 1000;
  const tasks: Promise<SongDetail[]>[] = [];
  for (let i = 0; i < trackIds.length; i += limit) {
    tasks.push(
      new Promise((resolve, reject) => {
        eapiRequest<{ data: SongDetail[] }>(
          "https://interface3.music.163.com/eapi/song/enhance/player/url",
          {
            ids: `[${trackIds.slice(i, i + limit).join(",")}]`,
            br: MUSIC_QUALITY,
          },
          "/api/song/enhance/player/url",
          "pc"
        )
          .then(({ data }) => {
            resolve(data);
          })
          .catch(reject);
      })
    );
  }
  try {
    return (await Promise.all(tasks))
      .flat()
      .reduce((result: SongDetail[], song) => {
        const { id, url, md5 } = song;
        result[trackIds.indexOf(song.id)] = { id, url, md5 };
        return result;
      }, []);
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiTopSong(areaId: TopSongType): Promise<SongsItem[]> {
  const key = `top_song${areaId}`;
  const value = apiCache.get(key);
  if (value) {
    return value as SongsItem[];
  }
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
    const ret = data.map((item) => solveAnotherSongItem(item));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}
