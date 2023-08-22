import type { NeteaseArtistArea, NeteaseArtistType } from "@cloudmusic/shared";
import { resolveAlbumsItem, resolveArtist, resolveSongItem } from "./helper.js";
import { API_CACHE } from "../../cache.js";
import type { NeteaseTypings } from "api";
import { weapiRequest } from "./request.js";

type ArtistsRet = {
  readonly artist: NeteaseTypings.Artist;
  readonly hotSongs: readonly NeteaseTypings.SongsItem[];
};

export async function artists(id: number): Promise<ArtistsRet> {
  const key = `artists${id}`;
  const value = API_CACHE.get<ArtistsRet>(key);
  if (value) return value;
  const res = await weapiRequest<ArtistsRet>(`music.163.com/weapi/v1/artist/${id}`);
  if (!res) return { artist: <NeteaseTypings.Artist>{}, hotSongs: [] };
  const { artist, hotSongs } = res;
  const ret = {
    artist: resolveArtist(artist),
    hotSongs: hotSongs.map(resolveSongItem),
  };
  API_CACHE.set(key, ret);
  return ret;
}

export async function artistAlbum(id: number): Promise<readonly NeteaseTypings.AlbumsItem[]> {
  const key = `artist_album${id}`;
  const value = API_CACHE.get<readonly NeteaseTypings.AlbumsItem[]>(key);
  if (value) return value;
  const ret: NeteaseTypings.AlbumsItem[] = [];
  const limit = 50;
  let offset = 0;
  for (let i = 0; i < 16; ++i) {
    const res = await weapiRequest<{
      hotAlbums: readonly NeteaseTypings.AlbumsItem[];
      more: boolean;
    }>(`music.163.com/weapi/artist/albums/${id}`, {
      limit,
      offset,
      total: true,
    });
    if (!res) return [];
    const { hotAlbums, more } = res;
    ret.push(...hotAlbums.map(resolveAlbumsItem));
    if (more) offset += limit;
    else break;
  }
  if (ret.length > 0) API_CACHE.set(key, ret);
  return ret;
}

type ArtistDesc = readonly { ti: string; txt: string }[];

export async function artistDesc(id: number): Promise<ArtistDesc> {
  const key = `artist_desc${id}`;
  const value = API_CACHE.get<ArtistDesc>(key);
  if (value) return value;
  const res = await weapiRequest<{ introduction: ArtistDesc }>("music.163.com/weapi/artist/introduction", { id });
  if (!res) return [];
  API_CACHE.set(key, res.introduction);
  return res.introduction;
}

export async function artistList(
  type: NeteaseArtistType,
  area: NeteaseArtistArea,
  initial: NeteaseTypings.ArtistInitial,
  limit: number,
  offset: number,
): Promise<readonly NeteaseTypings.Artist[]> {
  const key = `artist_album${type}-${area}-${initial}-${limit}-${offset}`;
  const value = API_CACHE.get<readonly NeteaseTypings.Artist[]>(key);
  if (value) return value;
  const res = await weapiRequest<{ artists: readonly NeteaseTypings.Artist[] }>("music.163.com/weapi/v1/artist/list", {
    initial: initial.toUpperCase().charCodeAt(0), // TODO: fix
    offset,
    limit,
    total: true,
    type,
    area,
  });
  if (!res) return [];
  const ret = res.artists.map(resolveArtist);
  API_CACHE.set(key, ret);
  return ret;
}

export async function artistSongs(
  id: number,
  limit: number,
  offset: number,
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = `artist_songs${id}-${limit}-${offset}`;
  const value = API_CACHE.get<readonly NeteaseTypings.SongsItem[]>(key);
  if (value) return value;

  const res = await weapiRequest<{
    songs: readonly NeteaseTypings.SongsItemSt[];
  }>("music.163.com/weapi/v1/artist/songs", {
    id,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    private_cloud: true,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    work_type: 1,
    order: "hot", //hot,time
    offset,
    limit,
  });
  if (!res) return [];
  const ret = res.songs.map(resolveSongItem);
  API_CACHE.set(key, ret);
  return ret;
}

export async function artistSub(id: number, t: "sub" | "unsub"): Promise<boolean> {
  return !!(await weapiRequest(`music.163.com/weapi/artist/${t}`, {
    artistId: id,
    artistIds: `[${id}]`,
  }));
}

export async function artistSublist(): Promise<readonly NeteaseTypings.Artist[]> {
  const limit = 100;
  let offset = 0;
  const ret: NeteaseTypings.Artist[] = [];
  for (let i = 0; i < 16; ++i) {
    const res = await weapiRequest<{ data: readonly NeteaseTypings.Artist[] }>("music.163.com/weapi/artist/sublist", {
      limit,
      offset,
      total: true,
    });
    if (!res) return [];
    ret.push(...res.data.map(resolveArtist));
    if (res.data.length < limit) break;
    offset += limit;
  }
  return ret;
}

export async function simiArtist(artistid: number): Promise<readonly NeteaseTypings.Artist[]> {
  const key = `simi_artist${artistid}`;
  const value = API_CACHE.get<readonly NeteaseTypings.Artist[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    artists: readonly NeteaseTypings.Artist[];
  }>("music.163.com/weapi/discovery/simiArtist", { artistid });
  if (!res) return [];
  const ret = res.artists.map(resolveArtist);
  API_CACHE.set(key, ret);
  return ret;
}

export async function topArtists(limit: number, offset: number): Promise<readonly NeteaseTypings.Artist[]> {
  const key = `top_artists${limit}-${offset}`;
  const value = API_CACHE.get<readonly NeteaseTypings.Artist[]>(key);
  if (value) return value;
  const res = await weapiRequest<{ artists: readonly NeteaseTypings.Artist[] }>("music.163.com/weapi/artist/top", {
    limit,
    offset,
    total: true,
  });
  if (!res) return [];
  const ret = res.artists.map(resolveArtist);
  API_CACHE.set(key, ret);
  return ret;
}

export async function toplistArtist(): Promise<readonly NeteaseTypings.Artist[]> {
  const key = "toplist_artist";
  const value = API_CACHE.get<readonly NeteaseTypings.Artist[]>(key);
  if (value) return value;
  const res = await weapiRequest<{ list: { artists: readonly NeteaseTypings.Artist[] } }>(
    "music.163.com/weapi/toplist/artist",
    { type: 1, limit: 100, offset: 0, total: true },
  );
  if (!res) return [];
  const ret = res.list.artists.map(resolveArtist);
  API_CACHE.set(key, ret);
  return ret;
}
