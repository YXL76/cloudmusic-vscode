import type {
  PlaylistItem,
  RawPlaylistItem,
  SongsItem,
  SongsItemSt,
  TrackIdsItem,
  UserDetail,
} from "../constant";
import {
  apiRequest,
  resolvePlaylistItem,
  resolveSongItem,
  resolveSongItemSt,
  resolveUserDetail,
  weapiRequest,
} from ".";
import { apiCache } from "../util";
import { apiSongDetail } from ".";
import { unplayable } from "../constant";

type PlaylistCatlistItem = { name: string; category?: number; hot: boolean };

type PlaylistCatlist = Record<string, PlaylistCatlistItem[]>;

export async function apiPlaylistCatlist(): Promise<PlaylistCatlist> {
  const key = "playlist_catlist";
  const value = apiCache.get<PlaylistCatlist>(key);
  if (value) return value;
  try {
    const { sub, categories } = await weapiRequest<{
      sub: PlaylistCatlistItem[];
      categories: { [key: string]: string };
    }>("https://music.163.com/weapi/playlist/catalogue", {});
    const ret: PlaylistCatlist = {};
    for (const [key, value] of Object.entries(categories)) {
      ret[value] = sub
        .filter((value) => value.category && `${value.category}` === key)
        .map(({ name, hot }) => ({ name, hot }));
    }
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return {};
}

export async function apiPlaylistCreate(
  name: string,
  privacy: 0 | 10
): Promise<boolean> {
  try {
    await weapiRequest(
      "https://music.163.com/api/playlist/create",
      {
        name,
        privacy, //0 为普通歌单，10 为隐私歌单
        type: "NORMAL", // NORMAL|VIDEO
      },
      { os: "pc" }
    );
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiPlaylistDelete(id: number): Promise<boolean> {
  try {
    await weapiRequest(
      `https://music.163.com/weapi/playlist/remove`,
      {
        ids: `[${id}]`,
      },
      { os: "pc" }
    );
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiPlaylistDetail(id: number): Promise<SongsItem[]> {
  const key = `playlist_detail${id}`;
  const value = apiCache.get<SongsItem[]>(key);
  if (value) return value;
  let ret!: SongsItem[];
  try {
    const {
      playlist: { tracks, trackIds },
      privileges,
    } = await apiRequest<{
      playlist: { tracks: SongsItem[]; trackIds: TrackIdsItem[] };
      privileges: { st: number }[];
    }>("https://music.163.com/api/v6/playlist/detail", { id, n: 100000, s: 8 });

    const ids = trackIds.map(({ id }) => id);
    if (tracks.length === trackIds.length) {
      privileges.forEach(({ st }, i) => {
        if (st < 0) unplayable.add(ids[i]);
      });
      ret = tracks.map(resolveSongItem);
    } else ret = await apiSongDetail(ids);

    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiHighqualityTags(): Promise<PlaylistCatlistItem[]> {
  const key = "playlist_highquality_tags";
  const value = apiCache.get<PlaylistCatlistItem[]>(key);
  if (value) return value;
  try {
    const { tags } = await weapiRequest<{
      tags: {
        name: string;
        hot: boolean;
      }[];
    }>("https://music.163.com/api/playlist/highquality/tags", {});
    const ret = tags.map(({ name, hot }) => ({ name, hot }));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiPlaylistSubscribe(
  id: number,
  t: "subscribe" | "unsubscribe"
): Promise<boolean> {
  try {
    await weapiRequest(`https://music.163.com/weapi/playlist/${t}`, {
      id,
    });
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiPlaylistSubscribers(
  id: number,
  limit: number,
  offset: number
): Promise<UserDetail[]> {
  const key = `playlist_subscribers${id}-${limit}-${offset}`;
  const value = apiCache.get<UserDetail[]>(key);
  if (value) return value;
  try {
    const { subscribers } = await weapiRequest<{
      subscribers: UserDetail[];
    }>("https://music.163.com/weapi/playlist/subscribers", {
      id,
      limit,
      offset,
    });
    const ret = subscribers.map(resolveUserDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiPlaylistTracks(
  op: "add" | "del",
  pid: number,
  tracks: number[]
): Promise<boolean> {
  try {
    await weapiRequest(
      "https://music.163.com/api/playlist/manipulate/tracks",
      { op, pid, trackIds: JSON.stringify(tracks), imme: "true" },
      { os: "pc" }
    );
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiPlaylistUpdate(
  id: number,
  name: string,
  desc: string
): Promise<boolean> {
  try {
    await weapiRequest(
      "https://music.163.com/weapi/batch",
      {
        "/api/playlist/desc/update": `{"id":${id},"desc":"${desc}"}`,
        "/api/playlist/update/name": `{"id":${id},"name":"${name}"}`,
      },
      { os: "pc" }
    );
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiPlaymodeIntelligenceList(
  songId: number,
  playlistId: number
): Promise<SongsItem[]> {
  try {
    const { data } = await weapiRequest<{ data: { songInfo: SongsItemSt }[] }>(
      "https://music.163.com/weapi/playmode/intelligence/list",
      {
        songId,
        type: "fromPlayOne",
        playlistId,
        startMusicId: songId,
        count: 1,
      }
    );
    return data.map(({ songInfo }) => resolveSongItemSt(songInfo));
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiSimiPlaylist(
  songid: number,
  limit: number,
  offset: number
): Promise<PlaylistItem[]> {
  const key = `simi_playlist${songid}-${limit}-${offset}`;
  const value = apiCache.get<PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { playlists } = await weapiRequest<{ playlists: RawPlaylistItem[] }>(
      "https://music.163.com/weapi/discovery/simiPlaylist",
      { songid, limit, offset }
    );
    const ret = playlists.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiTopPlaylist(
  cat: string,
  limit: number,
  offset: number
): Promise<PlaylistItem[]> {
  const key = `top_playlist${cat}-${limit}-${offset}`;
  const value = apiCache.get<PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { playlists } = await weapiRequest<{ playlists: PlaylistItem[] }>(
      "https://music.163.com/weapi/playlist/list",
      {
        cat, // 全部,华语,欧美,日语,韩语,粤语,小语种,流行,摇滚,民谣,电子,舞曲,说唱,轻音乐,爵士,乡村,R&B/Soul,古典,民族,英伦,金属,朋克,蓝调,雷鬼,世界音乐,拉丁,另类/独立,New Age,古风,后摇,Bossa Nova,清晨,夜晚,学习,工作,午休,下午茶,地铁,驾车,运动,旅行,散步,酒吧,怀旧,清新,浪漫,性感,伤感,治愈,放松,孤独,感动,兴奋,快乐,安静,思念,影视原声,ACG,儿童,校园,游戏,70后,80后,90后,网络歌曲,KTV,经典,翻唱,吉他,钢琴,器乐,榜单,00后
        order: "hot", // hot,new
        limit,
        offset,
        total: true,
      }
    );
    const ret = playlists.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiTopPlaylistHighquality(
  cat: string,
  limit: number
): Promise<PlaylistItem[]> {
  const key = `top_playlist_highquality${cat}-${limit}`;
  const value = apiCache.get<PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { playlists } = await weapiRequest<{ playlists: PlaylistItem[] }>(
      "https://music.163.com/api/playlist/highquality/list",
      {
        cat: cat, // 全部,华语,欧美,韩语,日语,粤语,小语种,运动,ACG,影视原声,流行,摇滚,后摇,古风,民谣,轻音乐,电子,器乐,说唱,古典,爵士
        limit,
        lasttime: 0, // 歌单updateTime
        total: true,
      }
    );
    const ret = playlists.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiToplist(): Promise<PlaylistItem[]> {
  const key = "toplist";
  const value = apiCache.get<PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { list } = await apiRequest<{ list: RawPlaylistItem[] }>(
      "https://music.163.com/api/toplist",
      {}
    );
    const ret = list.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}
