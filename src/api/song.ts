import type {
  AnotherSongItem,
  LyricData,
  LyricLine,
  LyricUser,
  SongDetail,
  SongsItem,
} from "../constant";
import { LyricCache, apiCache } from "../util";
import { MUSIC_QUALITY, UNBLOCK_MUSIC, unplayable } from "../constant";
import {
  apiRequest,
  eapiRequest,
  solveAnotherSongItem,
  solveSongItem,
  weapiRequest,
} from ".";
import type { TopSongType } from ".";
import i18n from "../i18n";
import unblock from "../unblock";

const resolveLyric = (raw: string, user?: LyricUser): LyricLine => {
  const time = [0];
  const text = [i18n.word.lyric];
  const lines = raw.split("\n");
  for (const line of lines) {
    const r = /^\[(\d{2}):(\d{2})\.(\d{3})\](.*)$/g.exec(line.trim());
    if (r) {
      const minute = parseInt(r[1]);
      const second = parseInt(r[2]);
      const millisecond = parseInt(r[3]);
      time.push((minute * 60 + second) * 1000 + millisecond);
      text.push(r[4] || i18n.word.lyric);
    }
  }
  return {
    time,
    text,
    user: user ? { nickname: user.nickname, userid: user.userid } : undefined,
  };
};

export async function apiLyric(id: number): Promise<LyricData> {
  const lyricCache = await LyricCache.get(`${id}`);
  if (lyricCache) return lyricCache;

  try {
    const { lrc, tlyric, lyricUser, transUser } = await apiRequest<{
      lrc: { lyric: string };
      tlyric: { lyric: string };
      lyricUser?: LyricUser;
      transUser?: LyricUser;
    }>("https://music.163.com/api/song/lyric", { id, lv: -1, kv: -1, tv: -1 });

    const lyric = {
      lrc: resolveLyric(lrc.lyric, lyricUser),
      tlyric: resolveLyric(tlyric.lyric, transUser),
    };

    LyricCache.put(`${id}`, lyric);
    return lyric;
  } catch {}
  return {
    lrc: { time: [0], text: [i18n.word.lyric] },
    tlyric: { time: [0], text: [i18n.word.lyric] },
  };
}

export async function apiSimiSong(
  songid: number,
  limit: number,
  offset: number
): Promise<SongsItem[]> {
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

export async function apiSongDetail(trackIds: number[]): Promise<SongsItem[]> {
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
        })
          .then(({ songs, privileges }) => {
            if (UNBLOCK_MUSIC.enabled) {
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

export async function apiSongUrl(song: SongsItem): Promise<SongDetail> {
  try {
    if (UNBLOCK_MUSIC.enabled) {
      if (unplayable.has(song.id)) {
        const data = await unblock(song);
        if (data) return data;
        return {} as SongDetail;
      } else {
        const { data } = await eapiRequest<{
          data: (SongDetail & {
            freeTrialInfo?: { start: number; end: number };
          })[];
        }>(
          "https://interface3.music.163.com/eapi/song/enhance/player/url",
          {
            ids: `[${song.id}]`,
            br: MUSIC_QUALITY,
          },
          "/api/song/enhance/player/url",
          "pc"
        );
        if (data[0].freeTrialInfo) {
          const rep = await unblock(song);
          if (rep) return rep;
        }
        const { url, md5, type } = data[0];
        return { url, md5, type };
      }
    } else {
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
    }
  } catch (err) {
    console.error(err);
  }
  return {} as SongDetail;
}

export async function apiTopSong(areaId: TopSongType): Promise<SongsItem[]> {
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
