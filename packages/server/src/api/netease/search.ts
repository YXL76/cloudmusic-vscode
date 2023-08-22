import { ACCOUNT_STATE, resolveAlbumsItem, resolveArtist, resolvePlaylistItem, resolveSongItem } from "./helper.js";
import { eapiRequest, weapiRequest } from "./request.js";
import { API_CACHE } from "../../cache.js";
import { NeteaseSearchType } from "@cloudmusic/shared";
import type { NeteaseTypings } from "api";

export async function searchDefault(uid: number): Promise<string> {
  const key = "search_default";
  const value = API_CACHE.get<string>(key);
  if (value) return value;
  const res = await eapiRequest<{ data: { realkeyword: string } }>(
    "interface3.music.163.com/eapi/search/defaultkeyword/get",
    {},
    "/api/search/defaultkeyword/get",
    ACCOUNT_STATE.cookies.get(uid),
  );
  if (!res) return "";
  const {
    data: { realkeyword },
  } = res;
  API_CACHE.set(key, realkeyword);
  return realkeyword;
}

export async function searchSingle(
  uid: number,
  s: string,
  limit: number,
  offset: number,
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = `cloudsearch${NeteaseSearchType.single}-${s}-${limit}-${offset}`;
  const value = API_CACHE.get<readonly NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  const res = await eapiRequest<{
    result: { songs: readonly NeteaseTypings.SongsItemSt[] };
  }>(
    "interface.music.163.com/eapi/cloudsearch/pc",
    { s, type: NeteaseSearchType.single, limit, offset, total: true },
    "/api/cloudsearch/pc",
    ACCOUNT_STATE.cookies.get(uid),
  );
  if (!res) return [];
  const ret = res.result.songs.map(resolveSongItem);
  API_CACHE.set(key, ret);
  return ret;
}

export async function searchAlbum(
  uid: number,
  s: string,
  limit: number,
  offset: number,
): Promise<readonly NeteaseTypings.AlbumsItem[]> {
  const key = `cloudsearch${NeteaseSearchType.album}-${s}-${limit}-${offset}`;
  const value = API_CACHE.get<readonly NeteaseTypings.AlbumsItem[]>(key);
  if (value) return value;
  const res = await eapiRequest<{
    result: { albums: readonly NeteaseTypings.AlbumsItem[] };
  }>(
    "interface.music.163.com/eapi/cloudsearch/pc",
    { s, type: NeteaseSearchType.album, limit, offset, total: true },
    "/api/cloudsearch/pc",
    ACCOUNT_STATE.cookies.get(uid),
  );
  if (!res) return [];
  const ret = res.result.albums.map(resolveAlbumsItem);
  API_CACHE.set(key, ret);
  return ret;
}

export async function searchArtist(
  uid: number,
  s: string,
  limit: number,
  offset: number,
): Promise<readonly NeteaseTypings.Artist[]> {
  const key = `cloudsearch${NeteaseSearchType.artist}-${s}-${limit}-${offset}`;
  const value = API_CACHE.get<readonly NeteaseTypings.Artist[]>(key);
  if (value) return value;
  const res = await eapiRequest<{
    result: { artists: readonly NeteaseTypings.Artist[] };
  }>(
    "interface.music.163.com/eapi/cloudsearch/pc",
    { s, type: NeteaseSearchType.artist, limit, offset, total: true },
    "/api/cloudsearch/pc",
    ACCOUNT_STATE.cookies.get(uid),
  );
  if (!res) return [];
  const ret = res.result.artists.map((artist) => resolveArtist({ ...artist, briefDesc: "" }));
  API_CACHE.set(key, ret);
  return ret;
}

export async function searchPlaylist(
  uid: number,
  s: string,
  limit: number,
  offset: number,
): Promise<readonly NeteaseTypings.PlaylistItem[]> {
  const key = `cloudsearch${NeteaseSearchType.playlist}-${s}-${limit}-${offset}`;
  const value = API_CACHE.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  const res = await eapiRequest<{
    result: { playlists: readonly NeteaseTypings.RawPlaylistItem[] };
  }>(
    "interface.music.163.com/eapi/cloudsearch/pc",
    { s, type: NeteaseSearchType.playlist, limit, offset, total: true },
    "/api/cloudsearch/pc",
    ACCOUNT_STATE.cookies.get(uid),
  );
  if (!res) return [];
  const ret = res.result.playlists.map(resolvePlaylistItem);
  API_CACHE.set(key, ret);
  return ret;
}

type SearchLyricResult = NeteaseTypings.SongsItem & {
  lyrics: readonly string[];
};

export async function searchLyric(
  uid: number,
  s: string,
  limit: number,
  offset: number,
): Promise<readonly SearchLyricResult[]> {
  const key = `cloudsearch${NeteaseSearchType.lyric}-${s}-${limit}-${offset}`;
  const value = API_CACHE.get<readonly SearchLyricResult[]>(key);
  if (value) return value;
  const res = await eapiRequest<{
    result: {
      songs: readonly (NeteaseTypings.SongsItemSt & {
        lyrics: readonly string[];
      })[];
    };
  }>(
    "interface.music.163.com/eapi/cloudsearch/pc",
    { s, type: NeteaseSearchType.lyric, limit, offset, total: true },
    "/api/cloudsearch/pc",
    ACCOUNT_STATE.cookies.get(uid),
  );
  if (!res) return [];
  const ret = res.result.songs.map((song) => ({
    ...resolveSongItem(song),
    lyrics: song.lyrics,
  }));
  API_CACHE.set(key, ret);
  return ret;
}

type HotDetail = readonly { searchWord: string; content: string }[];

export async function searchHotDetail(uid: number): Promise<HotDetail> {
  const key = "search_hot_detail";
  const value = API_CACHE.get<HotDetail>(key);
  if (value) return value;
  const res = await weapiRequest<{ data: HotDetail }>(
    "music.163.com/weapi/hotsearchlist/get",
    {},
    ACCOUNT_STATE.cookies.get(uid),
  );
  if (!res) return [];
  const ret = res.data.map(({ searchWord, content }) => ({
    searchWord,
    content,
  }));
  API_CACHE.set(key, ret);
  return ret;
}

export async function searchSuggest(uid: number, keywords: string): Promise<readonly string[]> {
  const key = `search_suggest${keywords}`;
  const value = API_CACHE.get<readonly string[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    result: { allMatch?: readonly { keyword: string }[] };
  }>("music.163.com/weapi/search/suggest/keyword", { s: keywords }, ACCOUNT_STATE.cookies.get(uid));
  if (!res || !res.result.allMatch) return [];
  const ret = res.result.allMatch.map(({ keyword }) => keyword);
  API_CACHE.set(key, ret);
  return ret;
}
