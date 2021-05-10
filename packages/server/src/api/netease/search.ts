import { eapiRequest, weapiRequest } from "./request";
import {
  resolveAlbumsItem,
  resolveArtist,
  resolvePlaylistItem,
  resolveSongItemSt,
} from "./helper";
import { NeteaseEnum } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import { apiCache } from "../..";

export async function searchDefault(): Promise<string> {
  const key = "search_default";
  const value = apiCache.get<string>(key);
  if (value) return value;
  try {
    const {
      data: { realkeyword },
    } = await eapiRequest<{ data: { realkeyword: string } }>(
      "https://interface3.music.163.com/eapi/search/defaultkeyword/get",
      {},
      "/api/search/defaultkeyword/get"
    );
    apiCache.set(key, realkeyword);
    return realkeyword;
  } catch (err) {
    console.error(err);
  }
  return "";
}

export async function searchSingle(
  s: string,
  limit: number,
  offset: number
): Promise<NeteaseTypings.SongsItem[]> {
  const key = `cloudsearch${NeteaseEnum.SearchType.single}-${s}-${limit}-${offset}`;
  const value = apiCache.get<NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  try {
    const {
      result: { songs },
    } = await weapiRequest<{ result: { songs: NeteaseTypings.SongsItemSt[] } }>(
      "https://music.163.com/api/cloudsearch/pc",
      { s, type: NeteaseEnum.SearchType.single, limit, offset, total: true }
    );
    const ret = songs.map(resolveSongItemSt);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function searchAlbum(
  s: string,
  limit: number,
  offset: number
): Promise<NeteaseTypings.AlbumsItem[]> {
  const key = `cloudsearch${NeteaseEnum.SearchType.album}-${s}-${limit}-${offset}`;
  const value = apiCache.get<NeteaseTypings.AlbumsItem[]>(key);
  if (value) return value;
  try {
    const {
      result: { albums },
    } = await weapiRequest<{ result: { albums: NeteaseTypings.AlbumsItem[] } }>(
      "https://music.163.com/api/cloudsearch/pc",
      { s, type: NeteaseEnum.SearchType.album, limit, offset, total: true }
    );
    const ret = albums.map(resolveAlbumsItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function searchArtist(
  s: string,
  limit: number,
  offset: number
): Promise<NeteaseTypings.Artist[]> {
  const key = `cloudsearch${NeteaseEnum.SearchType.artist}-${s}-${limit}-${offset}`;
  const value = apiCache.get<NeteaseTypings.Artist[]>(key);
  if (value) return value;
  try {
    const {
      result: { artists },
    } = await weapiRequest<{ result: { artists: NeteaseTypings.Artist[] } }>(
      "https://music.163.com/api/cloudsearch/pc",
      { s, type: NeteaseEnum.SearchType.artist, limit, offset, total: true }
    );
    const ret = artists.map((artist) =>
      resolveArtist({ ...artist, briefDesc: "" })
    );
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function searchPlaylist(
  s: string,
  limit: number,
  offset: number
): Promise<NeteaseTypings.PlaylistItem[]> {
  const key = `cloudsearch${NeteaseEnum.SearchType.playlist}-${s}-${limit}-${offset}`;
  const value = apiCache.get<NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  try {
    const {
      result: { playlists },
    } = await weapiRequest<{
      result: { playlists: NeteaseTypings.RawPlaylistItem[] };
    }>("https://music.163.com/api/cloudsearch/pc", {
      s,
      type: NeteaseEnum.SearchType.playlist,
      limit,
      offset,
      total: true,
    });
    const ret = playlists.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

type SearchLyricResult = NeteaseTypings.SongsItem & { lyrics: string[] };

export async function searchLyric(
  s: string,
  limit: number,
  offset: number
): Promise<SearchLyricResult[]> {
  const key = `cloudsearch${NeteaseEnum.SearchType.lyric}-${s}-${limit}-${offset}`;
  const value = apiCache.get<SearchLyricResult[]>(key);
  if (value) return value;
  try {
    const {
      result: { songs },
    } = await weapiRequest<{
      result: { songs: (NeteaseTypings.SongsItemSt & { lyrics: string[] })[] };
    }>("https://music.163.com/api/cloudsearch/pc", {
      s,
      type: NeteaseEnum.SearchType.lyric,
      limit,
      offset,
      total: true,
    });
    const ret = songs.map((song) => ({
      ...resolveSongItemSt(song),
      lyrics: song.lyrics,
    }));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function searchHotDetail(): Promise<
  { searchWord: string; content: string }[]
> {
  const key = "search_hot_detail";
  const value = apiCache.get<{ searchWord: string; content: string }[]>(key);
  if (value) return value;
  try {
    const { data } = await weapiRequest<{
      data: { searchWord: string; content: string }[];
    }>("https://music.163.com/weapi/hotsearchlist/get", {});
    const ret = data.map(({ searchWord, content }) => ({
      searchWord,
      content,
    }));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function searchSuggest(keywords: string): Promise<string[]> {
  const key = `search_suggest${keywords}`;
  const value = apiCache.get<string[]>(key);
  if (value) return value;
  try {
    const {
      result: { allMatch },
    } = await weapiRequest<{
      result: { allMatch: { keyword: string }[] };
    }>("https://music.163.com/weapi/search/suggest/keyword", { s: keywords });
    const ret = allMatch.map(({ keyword }) => keyword);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}
