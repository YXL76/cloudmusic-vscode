import type { AlbumsItem, Artist, SongsItem, SongsItemSt } from "../constant";
import type { ArtistArea, ArtistInitial, ArtistType } from ".";
import {
  resolveAlbumsItem,
  resolveArtist,
  resolveSongItem,
  resolveSongItemSt,
  weapiRequest,
} from ".";
import { apiCache } from "../util";

export async function apiArtists(
  id: number
): Promise<{ info: Artist; songs: SongsItem[] }> {
  const key = `artists${id}`;
  const value = apiCache.get<{ info: Artist; songs: SongsItem[] }>(key);
  if (value) return value;
  try {
    const { artist, hotSongs } = await weapiRequest<{
      artist: Artist;
      hotSongs: SongsItem[];
    }>(`https://music.163.com/weapi/v1/artist/${id}`, {});
    const ret = {
      info: resolveArtist(artist),
      songs: hotSongs.map(resolveSongItem),
    };
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return { info: {} as Artist, songs: [] };
}

export async function apiArtistAlbum(id: number): Promise<AlbumsItem[]> {
  const key = `artist_album${id}`;
  const value = apiCache.get<AlbumsItem[]>(key);
  if (value) return value;
  let ret: AlbumsItem[] = [];
  const limit = 50;
  let offset = 0;
  try {
    for (let i = 0; i < 16; ++i) {
      const { hotAlbums, more } = await weapiRequest<{
        hotAlbums: AlbumsItem[];
        more: boolean;
      }>(`https://music.163.com/weapi/artist/albums/${id}`, {
        limit,
        offset,
        total: true,
      });
      ret = ret.concat(hotAlbums.map(resolveAlbumsItem));
      if (more) {
        offset += limit;
      } else {
        break;
      }
    }
  } catch (err) {
    console.error(err);
  }
  if (ret.length > 0) {
    apiCache.set(key, ret);
  }
  return ret;
}

type ArtistDesc = { ti: string; txt: string }[];

export async function apiArtistDesc(id: number): Promise<ArtistDesc> {
  const key = `artist_desc${id}`;
  const value = apiCache.get<ArtistDesc>(key);
  if (value) return value;
  try {
    const { introduction } = await weapiRequest<{ introduction: ArtistDesc }>(
      "https://music.163.com/weapi/artist/introduction",
      { id }
    );
    apiCache.set(key, introduction);
    return introduction;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiArtistList(
  type: ArtistType,
  area: ArtistArea,
  initial: ArtistInitial,
  limit: number,
  offset: number
): Promise<Artist[]> {
  const key = `artist_album${type}-${area}-${
    initial as string
  }-${limit}-${offset}`;
  const value = apiCache.get<Artist[]>(key);
  if (value) return value;
  try {
    const { artists } = await weapiRequest<{ artists: Artist[] }>(
      "https://music.163.com/api/v1/artist/list",
      {
        initial: initial.toUpperCase().charCodeAt(0) || undefined,
        offset,
        limit,
        total: true,
        type,
        area,
      }
    );
    const ret = artists.map(resolveArtist);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiArtistSongs(
  id: number,
  limit: number,
  offset: number
): Promise<SongsItem[]> {
  const key = `artist_songs${id}-${limit}-${offset}`;
  const value = apiCache.get<SongsItem[]>(key);
  if (value) return value;
  try {
    const { songs } = await weapiRequest<{ songs: SongsItemSt[] }>(
      "https://music.163.com/api/v1/artist/songs",
      {
        id,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        private_cloud: "true",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        work_type: 1,
        order: "hot", //hot,time
        offset,
        limit,
      },
      { os: "pc" }
    );
    const ret = songs.map(resolveSongItemSt);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiArtistSub(
  id: number,
  t: "sub" | "unsub"
): Promise<boolean> {
  try {
    await weapiRequest(`https://music.163.com/weapi/artist/${t}`, {
      artistId: id,
      artistIds: `[${id}]`,
    });
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiArtistSublist(): Promise<Artist[]> {
  const limit = 100;
  let offset = 0;
  let ret: Artist[] = [];
  try {
    for (let i = 0; i < 16; ++i) {
      const { data } = await weapiRequest<{ data: Artist[] }>(
        "https://music.163.com/weapi/artist/sublist",
        {
          limit,
          offset,
          total: true,
        }
      );
      ret = ret.concat(data.map(resolveArtist));
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

export async function apiSimiArtist(artistid: number): Promise<Artist[]> {
  const key = `simi_artist${artistid}`;
  const value = apiCache.get<Artist[]>(key);
  if (value) return value;
  try {
    const { artists } = await weapiRequest<{ artists: Artist[] }>(
      "https://music.163.com/weapi/discovery/simiArtist",
      { artistid }
    );
    const ret = artists.map(resolveArtist);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiTopArtists(
  limit: number,
  offset: number
): Promise<Artist[]> {
  const key = `top_artists${limit}-${offset}`;
  const value = apiCache.get<Artist[]>(key);
  if (value) return value;
  try {
    const { artists } = await weapiRequest<{ artists: Artist[] }>(
      "https://music.163.com/weapi/artist/top",
      { limit, offset, total: true }
    );
    const ret = artists.map(resolveArtist);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiToplistArtist(): Promise<Artist[]> {
  const key = "toplist_artist";
  const value = apiCache.get<Artist[]>(key);
  if (value) return value;
  try {
    const {
      list: { artists },
    } = await weapiRequest<{ list: { artists: Artist[] } }>(
      "https://music.163.com/weapi/toplist/artist",
      { type: 1, limit: 100, offset: 0, total: true }
    );
    const ret = artists.map(resolveArtist);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}
