import { resolveAlbumsItem, resolveSongItem } from "./helper";
import type { NeteaseTypings } from "api";
import { apiCache } from "../../cache";
import { weapiRequest } from "./request";

type AlbumRet = {
  readonly album: NeteaseTypings.AlbumsItem;
  readonly songs: readonly NeteaseTypings.SongsItem[];
};

export async function album(id: number): Promise<AlbumRet> {
  const key = `album${id}`;
  const value = apiCache.get<AlbumRet>(key);
  if (value) return value;
  const res = await weapiRequest<AlbumRet>(
    `music.163.com/weapi/v1/album/${id}`
  );
  if (!res) return { album: {} as NeteaseTypings.AlbumsItem, songs: [] };
  const { album, songs } = res;
  const ret = {
    album: resolveAlbumsItem(album),
    songs: songs.map(resolveSongItem),
  };
  apiCache.set(key, ret);
  return ret;
}

export async function albumNewest(): Promise<
  readonly NeteaseTypings.AlbumsItem[]
> {
  const key = "album_newest";
  const value = apiCache.get<readonly NeteaseTypings.AlbumsItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    albums: readonly NeteaseTypings.AlbumsItem[];
  }>("music.163.com/api/discovery/newAlbum");
  if (!res) return [];
  const ret = res.albums.map(resolveAlbumsItem);
  apiCache.set(key, ret);
  return ret;
}

export async function albumSub(
  id: number,
  t: "sub" | "unsub"
): Promise<boolean> {
  return !!(await weapiRequest(`music.163.com/api/album/${t}`, {
    id: `${id}`,
  }));
}

export async function albumSublist(): Promise<
  readonly NeteaseTypings.AlbumsItem[]
> {
  const limit = 100;
  let offset = 0;
  const ret: NeteaseTypings.AlbumsItem[] = [];
  for (let i = 0; i < 16; ++i) {
    const res = await weapiRequest<{
      data: readonly NeteaseTypings.AlbumsItem[];
    }>("music.163.com/weapi/album/sublist", {
      limit: `${limit}`,
      offset: `${offset}`,
      total: "true",
    });
    if (!res) return [];
    ret.push(...res.data.map(resolveAlbumsItem));
    if (res.data.length < limit) break;
    offset += limit;
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
  const res = await weapiRequest<{
    monthData: readonly NeteaseTypings.AlbumsItem[];
  }>("music.163.com/api/discovery/new/albums/area", {
    area: "ALL", // //ALL:全部,ZH:华语,EA:欧美,KR:韩国,JP:日本
    limit: "50",
    offset: "0",
    type: "new",
    year: `${date.getFullYear()}`,
    month: `${date.getMonth() + 1}`,
    total: "false",
    rcmd: "true",
  });
  if (!res) return [];
  const ret = res.monthData.map(resolveAlbumsItem);
  apiCache.set(key, ret);
  return ret;
}
