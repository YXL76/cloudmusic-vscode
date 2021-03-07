import type {
  AnotherSongItem,
  LyricData,
  LyricUser,
  SongDetail,
  SongsItem,
} from "../constant";
import { LyricCache, apiCache } from "../util";
import { MUSIC_QUALITY, UNBLOCK_MUSIC, unplayable } from "../constant";
import {
  apiRequest,
  eapiRequest,
  resolveAnotherSongItem,
  resolveSongItem,
  weapiRequest,
} from ".";
import type { TopSongType } from ".";
import i18n from "../i18n";
import unblock from "../unblock";

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
      text.push(r[4] || i18n.word.lyric);
    }
  }
  return { time, text };
};

const resolveLyricUser = (user?: LyricUser): LyricUser | undefined =>
  user ? { nickname: user.nickname, userid: user.userid } : undefined;

export async function apiLyric(id: number): Promise<LyricData> {
  const lyricCache = await LyricCache.get(`${id}`);
  if (lyricCache) return lyricCache;
  const lyric: LyricData = {
    ctime: Date.now(),
    time: [0],
    o: { text: [i18n.word.lyric] },
    t: { text: [i18n.word.lyric] },
  };

  try {
    const { lrc, tlyric, lyricUser, transUser } = await apiRequest<{
      lrc: { lyric: string };
      tlyric: { lyric: string };
      lyricUser?: LyricUser;
      transUser?: LyricUser;
    }>("https://music.163.com/api/song/lyric", { id, lv: -1, kv: -1, tv: -1 });

    lyric.o.user = resolveLyricUser(lyricUser);
    lyric.t.user = resolveLyricUser(transUser);

    const o = resolveLyric(lrc.lyric);
    const t = resolveLyric(tlyric.lyric);

    let i = 0;
    let j = 0;
    while (i < o.time.length && j < t.time.length) {
      const otime = o.time[i];
      const otext = o.text[i] || i18n.word.lyric;
      const ttime = t.time[j];
      const ttext = t.text[j] || i18n.word.lyric;
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

    LyricCache.put(`${id}`, lyric);
    return lyric;
  } catch {}
  return lyric;
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
    const ret = songs.map(resolveAnotherSongItem);
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
      (async () => {
        const { songs, privileges } = await weapiRequest<{
          songs: SongsItem[];
          privileges: { st: number }[];
        }>("https://music.163.com/weapi/v3/song/detail", {
          c: `[${ids.map((id) => `{"id":${id}}`).join(",")}]`,
        });
        privileges.forEach(({ st }, i) => {
          if (st < 0) unplayable.add(songs[i].id);
        });
        return songs.map(resolveSongItem);
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

export async function apiSongUrl(song: SongsItem): Promise<SongDetail> {
  try {
    if (unplayable.has(song.id) && UNBLOCK_MUSIC.enabled) {
      const data = await unblock(song);
      if (data) return data;
      return {} as SongDetail;
    }

    const { data } = await eapiRequest<{
      data: (SongDetail & { freeTrialInfo?: { start: number; end: number } })[];
    }>(
      "https://interface3.music.163.com/eapi/song/enhance/player/url",
      { ids: `[${song.id}]`, br: MUSIC_QUALITY },
      "/api/song/enhance/player/url",
      "pc"
    );
    const { url, md5, type, freeTrialInfo } = data[0];

    if (freeTrialInfo && UNBLOCK_MUSIC.enabled) {
      const rep = await unblock(song);
      if (rep) return rep;
    }
    return { url, md5, type };
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
    const ret = data.map(resolveAnotherSongItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}
