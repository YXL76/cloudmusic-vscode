import type {
  AlbumsItem,
  Artist,
  PlaylistItem,
  RawPlaylistItem,
  SongsItem,
} from "../constant";
import {
  SearchType,
  eapiRequest,
  solveAlbumsItem,
  solveArtist,
  solvePlaylistItem,
  solveSongItem,
  weapiRequest,
} from ".";
import { apiCache } from "../util";

export async function apiSearchDefault() {
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

export async function apiSearchSingle(
  keywords: string,
  limit: number,
  offset: number
) {
  const key = `cloudsearch${SearchType.single}-${keywords}-${limit}-${offset}`;
  const value = apiCache.get<SongsItem[]>(key);
  if (value) return value;
  try {
    const {
      result: { songs },
    } = await weapiRequest<{ result: { songs: SongsItem[] } }>(
      "https://music.163.com/api/cloudsearch/pc",
      {
        s: keywords,
        type: SearchType.single,
        limit,
        offset,
        total: true,
      }
    );
    const ret = songs.map(solveSongItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiSearchAlbum(
  keywords: string,
  limit: number,
  offset: number
) {
  const key = `cloudsearch${SearchType.album}-${keywords}-${limit}-${offset}`;
  const value = apiCache.get<AlbumsItem[]>(key);
  if (value) return value;
  try {
    const {
      result: { albums },
    } = await weapiRequest<{ result: { albums: AlbumsItem[] } }>(
      "https://music.163.com/api/cloudsearch/pc",
      {
        s: keywords,
        type: SearchType.album,
        limit,
        offset,
        total: true,
      }
    );
    const ret = albums.map(solveAlbumsItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiSearchArtist(
  keywords: string,
  limit: number,
  offset: number
) {
  const key = `cloudsearch${SearchType.artist}-${keywords}-${limit}-${offset}`;
  const value = apiCache.get<Artist[]>(key);
  if (value) return value;
  try {
    const {
      result: { artists },
    } = await weapiRequest<{ result: { artists: Artist[] } }>(
      "https://music.163.com/api/cloudsearch/pc",
      {
        s: keywords,
        type: SearchType.artist,
        limit,
        offset,
        total: true,
      }
    );
    const ret = artists.map((artist) =>
      solveArtist({ ...artist, briefDesc: "" })
    );
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiSearchPlaylist(
  keywords: string,
  limit: number,
  offset: number
) {
  const key = `cloudsearch${SearchType.playlist}-${keywords}-${limit}-${offset}`;
  const value = apiCache.get<PlaylistItem[]>(key);
  if (value) return value;
  try {
    const {
      result: { playlists },
    } = await weapiRequest<{ result: { playlists: RawPlaylistItem[] } }>(
      "https://music.163.com/api/cloudsearch/pc",
      {
        s: keywords,
        type: SearchType.playlist,
        limit,
        offset,
        total: true,
      }
    );
    const ret = playlists.map(solvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiSearchHotDetail(): Promise<
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

export async function apiSearchSuggest(keywords: string) {
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
