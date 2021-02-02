import type { AlbumsItem, SongsItem } from "../constant";
import { solveAlbumsItem, solveSongItem, weapiRequest } from ".";
import { apiCache } from "../util";

export async function apiAlbum(id: number) {
  const key = `album${id}`;
  const value = apiCache.get<{ info: AlbumsItem; songs: SongsItem[] }>(key);
  if (value) return value;
  try {
    const { album, songs } = await weapiRequest<{
      album: AlbumsItem;
      songs: SongsItem[];
    }>(`https://music.163.com/weapi/v1/album/${id}`, {});
    const info = solveAlbumsItem(album);
    const ret = {
      info,
      songs: songs.map(solveSongItem),
    };
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return { info: {} as AlbumsItem, songs: [] };
}

export async function apiAlbumNewest() {
  const key = "album_newest";
  const value = apiCache.get<AlbumsItem[]>(key);
  if (value) return value;
  try {
    const { albums } = await weapiRequest<{ albums: AlbumsItem[] }>(
      "https://music.163.com/api/discovery/newAlbum",
      {}
    );
    const ret = albums.map(solveAlbumsItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiAlbumSub(id: number, t: "sub" | "unsub") {
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

export async function apiAlbumSublist() {
  const limit = 100;
  let offset = 0;
  let ret: AlbumsItem[] = [];
  try {
    for (let i = 0; i < 16; ++i) {
      const { data } = await weapiRequest<{ data: AlbumsItem[] }>(
        "https://music.163.com/weapi/album/sublist",
        { limit, offset, total: true }
      );
      ret = ret.concat(data.map(solveAlbumsItem));
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

export async function apiTopAlbum() {
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
    const ret = monthData.map(solveAlbumsItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}
