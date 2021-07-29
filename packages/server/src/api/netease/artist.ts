import {
  AccountState,
  resolveAlbumsItem,
  resolveArtist,
  resolveSongItem,
  resolveSongItemSt,
} from "./helper";
import { apiCache, logError } from "../..";
import type { NeteaseEnum } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import { weapiRequest } from "./request";

type ArtistsRet = {
  readonly artist: NeteaseTypings.Artist;
  readonly hotSongs: readonly NeteaseTypings.SongsItem[];
};

export async function artists(id: number): Promise<ArtistsRet> {
  const key = `artists${id}`;
  const value = apiCache.get<ArtistsRet>(key);
  if (value) return value;
  try {
    const { artist, hotSongs } = await weapiRequest<ArtistsRet>(
      `music.163.com/weapi/v1/artist/${id}`
    );
    const ret = {
      artist: resolveArtist(artist),
      hotSongs: hotSongs.map(resolveSongItem),
    };
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return { artist: {} as NeteaseTypings.Artist, hotSongs: [] };
}

export async function artistAlbum(
  id: number
): Promise<readonly NeteaseTypings.AlbumsItem[]> {
  const key = `artist_album${id}`;
  const value = apiCache.get<readonly NeteaseTypings.AlbumsItem[]>(key);
  if (value) return value;
  const ret: NeteaseTypings.AlbumsItem[] = [];
  const limit = 50;
  let offset = 0;
  try {
    for (let i = 0; i < 16; ++i) {
      const { hotAlbums, more } = await weapiRequest<{
        hotAlbums: readonly NeteaseTypings.AlbumsItem[];
        more: boolean;
      }>(`music.163.com/weapi/artist/albums/${id}`, {
        limit,
        offset,
        total: true,
      });
      ret.push(...hotAlbums.map(resolveAlbumsItem));
      if (more) offset += limit;
      else break;
    }
  } catch (err) {
    logError(err);
  }
  if (ret.length > 0) {
    apiCache.set(key, ret);
  }
  return ret;
}

type ArtistDesc = readonly { ti: string; txt: string }[];

export async function artistDesc(id: number): Promise<ArtistDesc> {
  const key = `artist_desc${id}`;
  const value = apiCache.get<ArtistDesc>(key);
  if (value) return value;
  try {
    const { introduction } = await weapiRequest<{ introduction: ArtistDesc }>(
      "music.163.com/weapi/artist/introduction",
      { id }
    );
    apiCache.set(key, introduction);
    return introduction;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function artistList(
  type: NeteaseEnum.ArtistType,
  area: NeteaseEnum.ArtistArea,
  initial: NeteaseTypings.ArtistInitial,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.Artist[]> {
  const key = `artist_album${type}-${area}-${
    initial as string
  }-${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.Artist[]>(key);
  if (value) return value;
  try {
    const { artists } = await weapiRequest<{
      artists: readonly NeteaseTypings.Artist[];
    }>("music.163.com/api/v1/artist/list", {
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
    logError(err);
  }
  return [];
}

export async function artistSongs(
  id: number,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = `artist_songs${id}-${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  try {
    const { songs } = await weapiRequest<{
      songs: readonly NeteaseTypings.SongsItemSt[];
    }>(
      "music.163.com/api/v1/artist/songs",
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
      { ...AccountState.defaultCookie, os: "pc" }
    );
    const ret = songs.map(resolveSongItemSt);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function artistSub(
  id: number,
  t: "sub" | "unsub"
): Promise<boolean> {
  try {
    await weapiRequest(`music.163.com/weapi/artist/${t}`, {
      artistId: id,
      artistIds: `[${id}]`,
    });
    return true;
  } catch (err) {
    logError(err);
  }
  return false;
}

export async function artistSublist(): Promise<
  readonly NeteaseTypings.Artist[]
> {
  const limit = 100;
  let offset = 0;
  const ret: NeteaseTypings.Artist[] = [];
  try {
    for (let i = 0; i < 16; ++i) {
      const { data } = await weapiRequest<{
        data: readonly NeteaseTypings.Artist[];
      }>("music.163.com/weapi/artist/sublist", {
        limit,
        offset,
        total: true,
      });
      ret.push(...data.map(resolveArtist));
      if (data.length < limit) break;
      offset += limit;
    }
  } catch (err) {
    logError(err);
  }
  return ret;
}

export async function simiArtist(
  artistid: number
): Promise<readonly NeteaseTypings.Artist[]> {
  const key = `simi_artist${artistid}`;
  const value = apiCache.get<readonly NeteaseTypings.Artist[]>(key);
  if (value) return value;
  try {
    const { artists } = await weapiRequest<{
      artists: readonly NeteaseTypings.Artist[];
    }>("music.163.com/weapi/discovery/simiArtist", { artistid });
    const ret = artists.map(resolveArtist);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function topArtists(
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.Artist[]> {
  const key = `top_artists${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.Artist[]>(key);
  if (value) return value;
  try {
    const { artists } = await weapiRequest<{
      artists: readonly NeteaseTypings.Artist[];
    }>("music.163.com/weapi/artist/top", {
      limit,
      offset,
      total: true,
    });
    const ret = artists.map(resolveArtist);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function toplistArtist(): Promise<
  readonly NeteaseTypings.Artist[]
> {
  const key = "toplist_artist";
  const value = apiCache.get<readonly NeteaseTypings.Artist[]>(key);
  if (value) return value;
  try {
    const {
      list: { artists },
    } = await weapiRequest<{
      list: { artists: readonly NeteaseTypings.Artist[] };
    }>("music.163.com/weapi/toplist/artist", {
      type: 1,
      limit: 100,
      offset: 0,
      total: true,
    });
    const ret = artists.map(resolveArtist);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}
