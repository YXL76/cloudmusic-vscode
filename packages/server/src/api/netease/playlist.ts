import {
  AccountState,
  resolvePlaylistItem,
  resolveSongItem,
  resolveSongItemSt,
  resolveUserDetail,
} from "./helper";
import { apiRequest, weapiRequest } from "./request";
import type { NeteaseTypings } from "api";
import { apiCache } from "../../cache";
import { logError } from "../../utils";
import { songDetail } from ".";

type PlaylistCatlistItem = { name: string; category?: number; hot: boolean };

type PlaylistCatlist = Record<string, readonly PlaylistCatlistItem[]>;

export async function playlistCatlist(): Promise<PlaylistCatlist> {
  const key = "playlist_catlist";
  const value = apiCache.get<PlaylistCatlist>(key);
  if (value) return value;
  try {
    const { sub, categories } = await weapiRequest<{
      sub: readonly PlaylistCatlistItem[];
      categories: { [key: string]: string };
    }>("music.163.com/weapi/playlist/catalogue");
    const ret: PlaylistCatlist = {};
    for (const [key, value] of Object.entries(categories)) {
      ret[value] = sub
        .filter((value) => value.category && `${value.category}` === key)
        .map(({ name, hot }) => ({ name, hot }));
    }
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return {};
}

export async function playlistCreate(
  name: string,
  privacy: 0 | 10
): Promise<boolean> {
  try {
    await weapiRequest(
      "music.163.com/api/playlist/create",
      {
        name,
        privacy, //0 为普通歌单，10 为隐私歌单
        type: "NORMAL", // NORMAL|VIDEO
      },
      { ...AccountState.defaultCookie, os: "pc" }
    );
    return true;
  } catch (err) {
    logError(err);
  }
  return false;
}

export async function playlistDelete(id: number): Promise<boolean> {
  try {
    await weapiRequest(
      `music.163.com/weapi/playlist/remove`,
      { ids: `[${id}]` },
      { ...AccountState.defaultCookie, os: "pc" }
    );
    return true;
  } catch (err) {
    logError(err);
  }
  return false;
}

export async function playlistDetail(
  id: number
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = `playlist_detail${id}`;
  const value = apiCache.get<readonly NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  let ret!: readonly NeteaseTypings.SongsItem[];
  try {
    const {
      playlist: { tracks, trackIds },
      privileges,
    } = await apiRequest<{
      playlist: {
        tracks: readonly NeteaseTypings.SongsItem[];
        trackIds: readonly NeteaseTypings.TrackIdsItem[];
      };
      privileges: readonly { st: number }[];
    }>("music.163.com/api/v6/playlist/detail", { id, n: 100000, s: 8 });

    const ids = trackIds.map(({ id }) => id);
    if (tracks.length === trackIds.length) {
      ret = tracks.filter((_, i) => privileges[i].st >= 0).map(resolveSongItem);
    } else ret = await songDetail(ids);

    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function highqualityTags(): Promise<
  readonly PlaylistCatlistItem[]
> {
  const key = "playlist_highquality_tags";
  const value = apiCache.get<readonly PlaylistCatlistItem[]>(key);
  if (value) return value;
  try {
    const { tags } = await weapiRequest<{
      tags: readonly {
        name: string;
        hot: boolean;
      }[];
    }>("music.163.com/api/playlist/highquality/tags");
    const ret = tags.map(({ name, hot }) => ({ name, hot }));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function playlistSubscribe(
  id: number,
  t: "subscribe" | "unsubscribe"
): Promise<boolean> {
  try {
    await weapiRequest(`music.163.com/weapi/playlist/${t}`, {
      id,
    });
    return true;
  } catch (err) {
    logError(err);
  }
  return false;
}

export async function playlistSubscribers(
  id: number,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.UserDetail[]> {
  const key = `playlist_subscribers${id}-${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.UserDetail[]>(key);
  if (value) return value;
  try {
    const { subscribers } = await weapiRequest<{
      subscribers: readonly NeteaseTypings.UserDetail[];
    }>("music.163.com/weapi/playlist/subscribers", {
      id,
      limit,
      offset,
    });
    const ret = subscribers.map(resolveUserDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function playlistTracks(
  uid: number,
  op: "add" | "del",
  pid: number,
  tracks: readonly number[]
): Promise<boolean> {
  try {
    await weapiRequest(
      "music.163.com/api/playlist/manipulate/tracks",
      { op, pid, trackIds: JSON.stringify(tracks), imme: "true" },
      { ...AccountState.cookies.get(uid), os: "pc" }
    );
    return true;
  } catch (err) {
    logError(err);
  }
  return false;
}

export async function playlistUpdate(
  id: number,
  name: string,
  desc: string
): Promise<boolean> {
  try {
    await weapiRequest(
      "music.163.com/weapi/batch",
      {
        "/api/playlist/desc/update": `{"id":${id},"desc":"${desc}"}`,
        "/api/playlist/update/name": `{"id":${id},"name":"${name}"}`,
      },
      { ...AccountState.defaultCookie, os: "pc" }
    );
    return true;
  } catch (err) {
    logError(err);
  }
  return false;
}

export async function playmodeIntelligenceList(
  songId: number,
  playlistId: number
): Promise<readonly NeteaseTypings.SongsItem[]> {
  try {
    const { data } = await weapiRequest<{
      data: readonly { songInfo: NeteaseTypings.SongsItemSt }[];
    }>("music.163.com/weapi/playmode/intelligence/list", {
      songId,
      type: "fromPlayOne",
      playlistId,
      startMusicId: songId,
      count: 1,
    });
    return data.map(({ songInfo }) => resolveSongItemSt(songInfo));
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function simiPlaylist(
  songid: number,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.PlaylistItem[]> {
  const key = `simi_playlist${songid}-${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { playlists } = await weapiRequest<{
      playlists: readonly NeteaseTypings.RawPlaylistItem[];
    }>("music.163.com/weapi/discovery/simiPlaylist", {
      songid,
      limit,
      offset,
    });
    const ret = playlists.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function topPlaylist(
  cat: string,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.PlaylistItem[]> {
  const key = `top_playlist${cat}-${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { playlists } = await weapiRequest<{
      playlists: readonly NeteaseTypings.PlaylistItem[];
    }>("music.163.com/weapi/playlist/list", {
      cat, // 全部,华语,欧美,日语,韩语,粤语,小语种,流行,摇滚,民谣,电子,舞曲,说唱,轻音乐,爵士,乡村,R&B/Soul,古典,民族,英伦,金属,朋克,蓝调,雷鬼,世界音乐,拉丁,另类/独立,New Age,古风,后摇,Bossa Nova,清晨,夜晚,学习,工作,午休,下午茶,地铁,驾车,运动,旅行,散步,酒吧,怀旧,清新,浪漫,性感,伤感,治愈,放松,孤独,感动,兴奋,快乐,安静,思念,影视原声,ACG,儿童,校园,游戏,70后,80后,90后,网络歌曲,KTV,经典,翻唱,吉他,钢琴,器乐,榜单,00后
      order: "hot", // hot,new
      limit,
      offset,
      total: true,
    });
    const ret = playlists.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function topPlaylistHighquality(
  cat: string,
  limit: number
): Promise<readonly NeteaseTypings.PlaylistItem[]> {
  const key = `top_playlist_highquality${cat}-${limit}`;
  const value = apiCache.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { playlists } = await weapiRequest<{
      playlists: readonly NeteaseTypings.PlaylistItem[];
    }>("music.163.com/api/playlist/highquality/list", {
      cat: cat, // 全部,华语,欧美,韩语,日语,粤语,小语种,运动,ACG,影视原声,流行,摇滚,后摇,古风,民谣,轻音乐,电子,器乐,说唱,古典,爵士
      limit,
      lasttime: 0, // 歌单updateTime
      total: true,
    });
    const ret = playlists.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function toplist(): Promise<
  readonly NeteaseTypings.PlaylistItem[]
> {
  const key = "toplist";
  const value = apiCache.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { list } = await apiRequest<{
      list: readonly NeteaseTypings.RawPlaylistItem[];
    }>("music.163.com/api/toplist");
    const ret = list.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}
