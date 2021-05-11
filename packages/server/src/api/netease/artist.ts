import {
  resolveAlbumsItem,
  resolveArtist,
  resolveSongItem,
  resolveSongItemSt,
} from "./helper";
import type { NeteaseEnum } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import { apiCache } from "../..";
import { weapiRequest } from "./request";

export async function artists(
  id: number
): Promise<{ info: NeteaseTypings.Artist; songs: NeteaseTypings.SongsItem[] }> {
  const key = `artists${id}`;
  const value =
    apiCache.get<{
      info: NeteaseTypings.Artist;
      songs: NeteaseTypings.SongsItem[];
    }>(key);
  if (value) return value;
  try {
    const { artist, hotSongs } = await weapiRequest<{
      artist: NeteaseTypings.Artist;
      hotSongs: NeteaseTypings.SongsItem[];
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
  return { info: {} as NeteaseTypings.Artist, songs: [] };
}

export async function artistAlbum(
  id: number
): Promise<NeteaseTypings.AlbumsItem[]> {
  const key = `artist_album${id}`;
  const value = apiCache.get<NeteaseTypings.AlbumsItem[]>(key);
  if (value) return value;
  const ret: NeteaseTypings.AlbumsItem[] = [];
  const limit = 50;
  let offset = 0;
  try {
    for (let i = 0; i < 16; ++i) {
      const { hotAlbums, more } = await weapiRequest<{
        hotAlbums: NeteaseTypings.AlbumsItem[];
        more: boolean;
      }>(`https://music.163.com/weapi/artist/albums/${id}`, {
        limit,
        offset,
        total: true,
      });
      ret.push(...hotAlbums.map(resolveAlbumsItem));
      if (more) offset += limit;
      else break;
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

export async function artistDesc(id: number): Promise<ArtistDesc> {
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

export async function artistList(
  type: NeteaseEnum.ArtistType,
  area: NeteaseEnum.ArtistArea,
  initial: NeteaseTypings.ArtistInitial,
  limit: number,
  offset: number
): Promise<NeteaseTypings.Artist[]> {
  const key = `artist_album${type}-${area}-${
    initial as string
  }-${limit}-${offset}`;
  const value = apiCache.get<NeteaseTypings.Artist[]>(key);
  if (value) return value;
  try {
    const { artists } = await weapiRequest<{
      artists: NeteaseTypings.Artist[];
    }>("https://music.163.com/api/v1/artist/list", {
      initial: initial.toUpperCase().charCodeAt(0) || undefined,
      offset,
      limit,
      total: true,
      type,
      area,
    });
    const ret = artists.map(resolveArtist);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function artistSongs(
  id: number,
  limit: number,
  offset: number
): Promise<NeteaseTypings.SongsItem[]> {
  const key = `artist_songs${id}-${limit}-${offset}`;
  const value = apiCache.get<NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  try {
    const { songs } = await weapiRequest<{
      songs: NeteaseTypings.SongsItemSt[];
    }>(
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

export async function artistSub(
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

export async function artistSublist(): Promise<NeteaseTypings.Artist[]> {
  const limit = 100;
  let offset = 0;
  const ret: NeteaseTypings.Artist[] = [];
  try {
    for (let i = 0; i < 16; ++i) {
      const { data } = await weapiRequest<{ data: NeteaseTypings.Artist[] }>(
        "https://music.163.com/weapi/artist/sublist",
        { limit, offset, total: true }
      );
      ret.push(...data.map(resolveArtist));
      if (data.length < limit) break;
      offset += limit;
    }
  } catch (err) {
    console.error(err);
  }
  return ret;
}

export async function simiArtist(
  artistid: number
): Promise<NeteaseTypings.Artist[]> {
  const key = `simi_artist${artistid}`;
  const value = apiCache.get<NeteaseTypings.Artist[]>(key);
  if (value) return value;
  try {
    const { artists } = await weapiRequest<{
      artists: NeteaseTypings.Artist[];
    }>("https://music.163.com/weapi/discovery/simiArtist", { artistid });
    const ret = artists.map(resolveArtist);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function topArtists(
  limit: number,
  offset: number
): Promise<NeteaseTypings.Artist[]> {
  const key = `top_artists${limit}-${offset}`;
  const value = apiCache.get<NeteaseTypings.Artist[]>(key);
  if (value) return value;
  try {
    const { artists } = await weapiRequest<{
      artists: NeteaseTypings.Artist[];
    }>("https://music.163.com/weapi/artist/top", {
      limit,
      offset,
      total: true,
    });
    const ret = artists.map(resolveArtist);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function toplistArtist(): Promise<NeteaseTypings.Artist[]> {
  const key = "toplist_artist";
  const value = apiCache.get<NeteaseTypings.Artist[]>(key);
  if (value) return value;
  try {
    const {
      list: { artists },
    } = await weapiRequest<{ list: { artists: NeteaseTypings.Artist[] } }>(
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
