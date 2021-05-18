import { apiCache, logError } from "../..";
import { resolveAlbumsItem, resolveSongItem } from "./helper";
import type { NeteaseTypings } from "api";
import { weapiRequest } from "./request";

export async function album(id: number): Promise<{
  info: NeteaseTypings.AlbumsItem;
  songs: readonly NeteaseTypings.SongsItem[];
}> {
  const key = `album${id}`;
  const value =
    apiCache.get<{
      info: NeteaseTypings.AlbumsItem;
      songs: readonly NeteaseTypings.SongsItem[];
    }>(key);
  if (value) return value;
  try {
    const { album, songs } = await weapiRequest<{
      album: NeteaseTypings.AlbumsItem;
      songs: readonly NeteaseTypings.SongsItem[];
    }>(`music.163.com/weapi/v1/album/${id}`, {});
    const info = resolveAlbumsItem(album);
    const ret = {
      info,
      songs: songs.map(resolveSongItem),
    };
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return { info: {} as NeteaseTypings.AlbumsItem, songs: [] };
}

export async function albumNewest(): Promise<
  readonly NeteaseTypings.AlbumsItem[]
> {
  const key = "album_newest";
  const value = apiCache.get<readonly NeteaseTypings.AlbumsItem[]>(key);
  if (value) return value;
  try {
    const { albums } = await weapiRequest<{
      albums: readonly NeteaseTypings.AlbumsItem[];
    }>("music.163.com/api/discovery/newAlbum", {});
    const ret = albums.map(resolveAlbumsItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function albumSub(
  id: number,
  t: "sub" | "unsub"
): Promise<boolean> {
  try {
    await weapiRequest(`music.163.com/api/album/${t}`, {
      id,
    });
    return true;
  } catch (err) {
    logError(err);
  }
  return false;
}

export async function albumSublist(): Promise<
  readonly NeteaseTypings.AlbumsItem[]
> {
  const limit = 100;
  let offset = 0;
  const ret: NeteaseTypings.AlbumsItem[] = [];
  try {
    for (let i = 0; i < 16; ++i) {
      const { data } = await weapiRequest<{
        data: readonly NeteaseTypings.AlbumsItem[];
      }>("music.163.com/weapi/album/sublist", {
        limit,
        offset,
        total: true,
      });
      ret.push(...data.map(resolveAlbumsItem));
      if (data.length < limit) break;
      offset += limit;
    }
  } catch (err) {
    logError(err);
  }
  return ret;
}

export async function topAlbum(): Promise<
  readonly NeteaseTypings.AlbumsItem[]
> {
  const key = "top_album";
  const value = apiCache.get<readonly NeteaseTypings.AlbumsItem[]>(key);
  if (value) return value;
  const date = new Date();
  try {
    const { monthData } = await weapiRequest<{
      monthData: readonly NeteaseTypings.AlbumsItem[];
    }>("music.163.com/api/discovery/new/albums/area", {
      area: "ALL", // //ALL:全部,ZH:华语,EA:欧美,KR:韩国,JP:日本
      limit: 50,
      offset: 0,
      type: "new",
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      total: false,
      rcmd: true,
    });
    const ret = monthData.map(resolveAlbumsItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}
