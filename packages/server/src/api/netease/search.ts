import {
  AccountState,
  resolveAlbumsItem,
  resolveArtist,
  resolvePlaylistItem,
  resolveSongItemSt,
} from "./helper";
import { eapiRequest, weapiRequest } from "./request";
import { NeteaseEnum } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";
import { apiCache } from "../../cache";

export async function searchDefault(uid: number): Promise<string> {
  const key = "search_default";
  const value = apiCache.get<string>(key);
  if (value) return value;
  const res = await eapiRequest<{ data: { realkeyword: string } }>(
    "interface3.music.163.com/eapi/search/defaultkeyword/get",
    {},
    "/api/search/defaultkeyword/get",
    AccountState.cookies.get(uid)
  );
  if (!res) return "";
  const {
    data: { realkeyword },
  } = res;
  apiCache.set(key, realkeyword);
  return realkeyword;
}

export async function searchSingle(
  uid: number,
  s: string,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = `cloudsearch${NeteaseEnum.SearchType.single}-${s}-${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    result: { songs: readonly NeteaseTypings.SongsItemSt[] };
  }>(
    "music.163.com/api/cloudsearch/pc",
    { s, type: NeteaseEnum.SearchType.single, limit, offset, total: true },
    AccountState.cookies.get(uid)
  );
  if (!res) return [];
  const ret = res.result.songs.map(resolveSongItemSt);
  apiCache.set(key, ret);
  return ret;
}

export async function searchAlbum(
  uid: number,
  s: string,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.AlbumsItem[]> {
  const key = `cloudsearch${NeteaseEnum.SearchType.album}-${s}-${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.AlbumsItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    result: { albums: readonly NeteaseTypings.AlbumsItem[] };
  }>(
    "music.163.com/api/cloudsearch/pc",
    { s, type: NeteaseEnum.SearchType.album, limit, offset, total: true },
    AccountState.cookies.get(uid)
  );
  if (!res) return [];
  const ret = res.result.albums.map(resolveAlbumsItem);
  apiCache.set(key, ret);
  return ret;
}

export async function searchArtist(
  uid: number,
  s: string,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.Artist[]> {
  const key = `cloudsearch${NeteaseEnum.SearchType.artist}-${s}-${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.Artist[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    result: { artists: readonly NeteaseTypings.Artist[] };
  }>(
    "music.163.com/api/cloudsearch/pc",
    { s, type: NeteaseEnum.SearchType.artist, limit, offset, total: true },
    AccountState.cookies.get(uid)
  );
  if (!res) return [];
  const ret = res.result.artists.map((artist) =>
    resolveArtist({ ...artist, briefDesc: "" })
  );
  apiCache.set(key, ret);
  return ret;
}

export async function searchPlaylist(
  uid: number,
  s: string,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.PlaylistItem[]> {
  const key = `cloudsearch${NeteaseEnum.SearchType.playlist}-${s}-${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    result: { playlists: readonly NeteaseTypings.RawPlaylistItem[] };
  }>(
    "music.163.com/api/cloudsearch/pc",
    { s, type: NeteaseEnum.SearchType.playlist, limit, offset, total: true },
    AccountState.cookies.get(uid)
  );
  if (!res) return [];
  const ret = res.result.playlists.map(resolvePlaylistItem);
  apiCache.set(key, ret);
  return ret;
}

type SearchLyricResult = NeteaseTypings.SongsItem & {
  lyrics: readonly string[];
};

export async function searchLyric(
  uid: number,
  s: string,
  limit: number,
  offset: number
): Promise<readonly SearchLyricResult[]> {
  const key = `cloudsearch${NeteaseEnum.SearchType.lyric}-${s}-${limit}-${offset}`;
  const value = apiCache.get<readonly SearchLyricResult[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    result: {
      songs: readonly (NeteaseTypings.SongsItemSt & {
        lyrics: readonly string[];
      })[];
    };
  }>(
    "music.163.com/api/cloudsearch/pc",
    { s, type: NeteaseEnum.SearchType.lyric, limit, offset, total: true },
    AccountState.cookies.get(uid)
  );
  if (!res) return [];
  const ret = res.result.songs.map((song) => ({
    ...resolveSongItemSt(song),
    lyrics: song.lyrics,
  }));
  apiCache.set(key, ret);
  return ret;
}

type HotDetail = readonly { searchWord: string; content: string }[];

export async function searchHotDetail(uid: number): Promise<HotDetail> {
  const key = "search_hot_detail";
  const value = apiCache.get<HotDetail>(key);
  if (value) return value;
  const res = await weapiRequest<{ data: HotDetail }>(
    "music.163.com/weapi/hotsearchlist/get",
    {},
    AccountState.cookies.get(uid)
  );
  if (!res) return [];
  const ret = res.data.map(({ searchWord, content }) => ({
    searchWord,
    content,
  }));
  apiCache.set(key, ret);
  return ret;
}

export async function searchSuggest(
  uid: number,
  keywords: string
): Promise<readonly string[]> {
  const key = `search_suggest${keywords}`;
  const value = apiCache.get<readonly string[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    result: { allMatch?: readonly { keyword: string }[] };
  }>(
    "music.163.com/weapi/search/suggest/keyword",
    { s: keywords },
    AccountState.cookies.get(uid)
  );
  if (!res || !res.result.allMatch) return [];
  const ret = res.result.allMatch.map(({ keyword }) => keyword);
  apiCache.set(key, ret);
  return ret;
}
