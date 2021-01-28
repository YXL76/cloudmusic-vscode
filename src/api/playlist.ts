import type {
  PlaylistItem,
  RawPlaylistItem,
  SongsItem,
  TrackIdsItem,
  UserDetail,
} from "../constant";
import { UNLOCK_MUSIC, unplayable } from "../constant";
import {
  apiRequest,
  solvePlaylistItem,
  solveSongItem,
  solveUserDetail,
  weapiRequest,
} from ".";
import { apiCache } from "../util";
import { apiSongDetail } from ".";

type PlaylistCatlistItem = { name: string; category?: number; hot: boolean };

type PlaylistCatlist = Record<string, PlaylistCatlistItem[]>;

export async function apiPlaylistCatlist() {
  const key = "playlist_catlist";
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistCatlist;
  }
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

export async function apiPlaylistCreate(name: string, privacy: 0 | 10) {
  try {
    await weapiRequest(
      "https://music.163.com/api/playlist/create",
      {
        name,
        privacy, //0 为普通歌单，10 为隐私歌单
        type: "NORMAL", // NORMAL|VIDEO
      },
      "pc"
    );
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiPlaylistDelete(id: number) {
  try {
    await weapiRequest(
      `https://music.163.com/weapi/playlist/remove`,
      {
        ids: `[${id}]`,
      },
      "pc"
    );
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiPlaylistDetail(id: number) {
  const key = `playlist_detail${id}`;
  const value = apiCache.get(key);
  if (value) {
    return value as SongsItem[];
  }
  try {
    const {
      playlist: { tracks, trackIds },
      privileges,
    } = await apiRequest<{
      playlist: { tracks: SongsItem[]; trackIds: TrackIdsItem[] };
      privileges: { st: number }[];
    }>("https://music.163.com/api/v6/playlist/detail", {
      id,
      n: 100000,
      s: 8,
    });
    if (tracks.length === trackIds.length) {
      if (UNLOCK_MUSIC) {
        for (let i = 0; i < privileges.length; ++i) {
          if (privileges[i].st < 0) {
            unplayable.add(tracks[i].id);
          }
        }
        return tracks;
      }
      const ret: SongsItem[] = [];
      for (let i = 0; i < privileges.length; ++i) {
        if (privileges[i].st >= 0) {
          ret.push(solveSongItem(tracks[i]));
        }
      }
      apiCache.set(key, ret);
      return ret;
    }
    const ret = await apiSongDetail(trackIds.map((trackId) => trackId.id));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiHighqualityTags() {
  const key = "playlist_highquality_tags";
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistCatlistItem[];
  }
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
) {
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
) {
  const key = `playlist_subscribers${id}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as UserDetail[];
  }
  try {
    const { subscribers } = await weapiRequest<{
      subscribers: UserDetail[];
    }>("https://music.163.com/weapi/playlist/subscribers", {
      id,
      limit,
      offset,
    });
    const ret = subscribers.map((subscriber) => solveUserDetail(subscriber));
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
) {
  try {
    await weapiRequest(
      "https://music.163.com/api/playlist/manipulate/tracks",
      {
        op,
        pid,
        trackIds: JSON.stringify(tracks),
        imme: "true",
      },
      "pc"
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
) {
  try {
    await weapiRequest(
      "https://music.163.com/weapi/batch",
      {
        "/api/playlist/desc/update": `{"id":${id},"desc":"${desc}"}`,
        "/api/playlist/update/name": `{"id":${id},"name":"${name}"}`,
      },
      "pc"
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
) {
  let ret: SongsItem[] = [];
  try {
    const { data } = await weapiRequest<{ data: { songInfo: SongsItem }[] }>(
      "https://music.163.com/weapi/playmode/intelligence/list",
      {
        songId,
        type: "fromPlayOne",
        playlistId,
        startMusicId: songId,
        count: 1,
      }
    );
    ret = data.map(({ songInfo }) => solveSongItem(songInfo));
  } catch (err) {
    console.error(err);
  }
  return ret;
}

export async function apiSimiPlaylist(
  songid: number,
  limit: number,
  offset: number
) {
  const key = `simi_playlist${songid}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
  try {
    const { playlists } = await weapiRequest<{ playlists: RawPlaylistItem[] }>(
      "https://music.163.com/weapi/discovery/simiPlaylist",
      { songid, limit, offset }
    );
    const ret = playlists.map((playlist) => solvePlaylistItem(playlist));
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
) {
  const key = `top_playlist${cat}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
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
    const ret = playlists.map((playlist) => solvePlaylistItem(playlist));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiTopPlaylistHighquality(cat: string, limit: number) {
  const key = `top_playlist_highquality${cat}-${limit}`;
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
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
    const ret = playlists.map((playlist) => solvePlaylistItem(playlist));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiToplist() {
  const key = "toplist";
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
  try {
    const { list } = await apiRequest<{ list: RawPlaylistItem[] }>(
      "https://music.163.com/api/toplist",
      {}
    );
    const ret = list.map((item) => solvePlaylistItem(item));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}
