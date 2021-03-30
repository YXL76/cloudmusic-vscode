import type { AlbumsItem, SongsItem } from "../constant";
import { resolveAlbumsItem, resolveSongItem, weapiRequest } from ".";
import { apiCache } from "../util";

export async function apiAlbum(
  id: number
): Promise<{ info: AlbumsItem; songs: SongsItem[] }> {
  const key = `album${id}`;
  const value = apiCache.get<{ info: AlbumsItem; songs: SongsItem[] }>(key);
  if (value) return value;
  try {
    const { album, songs } = await weapiRequest<{
      album: AlbumsItem;
      songs: SongsItem[];
    }>(`https://music.163.com/weapi/v1/album/${id}`, {});
    const info = resolveAlbumsItem(album);
    const ret = {
      info,
      songs: songs.map(resolveSongItem),
    };
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return { info: {} as AlbumsItem, songs: [] };
}

export async function apiAlbumNewest(): Promise<AlbumsItem[]> {
  const key = "album_newest";
  const value = apiCache.get<AlbumsItem[]>(key);
  if (value) return value;
  try {
    const { albums } = await weapiRequest<{ albums: AlbumsItem[] }>(
      "https://music.163.com/api/discovery/newAlbum",
      {}
    );
    const ret = albums.map(resolveAlbumsItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiAlbumSub(
  id: number,
  t: "sub" | "unsub"
): Promise<boolean> {
  try {
    await weapiRequest(`https://music.163.com/api/album/${t}`, {
      id,
    });
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiAlbumSublist(): Promise<AlbumsItem[]> {
  const limit = 100;
  let offset = 0;
  const ret: AlbumsItem[] = [];
  try {
    for (let i = 0; i < 16; ++i) {
      const { data } = await weapiRequest<{ data: AlbumsItem[] }>(
        "https://music.163.com/weapi/album/sublist",
        { limit, offset, total: true }
      );
      ret.push(...data.map(resolveAlbumsItem));
      if (data.length < limit) {
        break;
      }
      offset += limit;
    }
  } catch (err) {
    console.error(err);
  }
  return ret;
}

export async function apiTopAlbum(): Promise<AlbumsItem[]> {
  const key = "top_album";
  const value = apiCache.get<AlbumsItem[]>(key);
  if (value) return value;
  const date = new Date();
  try {
    const { monthData } = await weapiRequest<{ monthData: AlbumsItem[] }>(
      "https://music.163.com/api/discovery/new/albums/area",
      {
        area: "ALL", // //ALL:全部,ZH:华语,EA:欧美,KR:韩国,JP:日本
        limit: 50,
        offset: 0,
        type: "new",
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        total: false,
        rcmd: true,
      }
    );
    const ret = monthData.map(resolveAlbumsItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}
