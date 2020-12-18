import type {
  AnotherSongItem,
  PlaylistItem,
  RawPlaylistItem,
  SongsItem,
  UserDetail,
} from "../constant";
import {
  eapiRequest,
  solveAnotherSongItem,
  solvePlaylistItem,
  solveSongItem,
  solveUserDetail,
  weapiRequest,
} from ".";
import { AccountManager } from "../manager";
import { apiCache } from "../util";

export async function apiDailySignin(): Promise<boolean> {
  const tasks: Promise<void>[] = [];
  tasks.push(
    new Promise((resolve, reject) => {
      weapiRequest("https://music.163.com/weapi/point/dailyTask", {
        type: 0,
      })
        .then(() => resolve)
        .catch(reject);
    })
  );
  tasks.push(
    new Promise((resolve, reject) => {
      weapiRequest("https://music.163.com/weapi/point/dailyTask", {
        type: 1,
      })
        .then(() => resolve)
        .catch(reject);
    })
  );
  try {
    await Promise.all(tasks);
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiFmTrash(songId: number): Promise<boolean> {
  try {
    await weapiRequest(
      `https://music.163.com/weapi/radio/trash/add?alg=RT&songId=${songId}&time=25`,
      { songId }
    );
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiLike(
  trackId: number,
  like: boolean
): Promise<boolean> {
  try {
    await weapiRequest(
      `https://music.163.com/weapi/radio/like?alg=itembased&trackId=${trackId}&time=25`,
      { trackId, like }
    );
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiLikelist(): Promise<number[]> {
  try {
    const { ids } = await weapiRequest<{ ids: number[] }>(
      "https://music.163.com/weapi/song/like/get",
      { uid: AccountManager.uid }
    );
    return ids;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiLogout(): Promise<boolean> {
  try {
    await weapiRequest("https://music.163.com/weapi/logout", {});
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiPersonalFm(): Promise<SongsItem[]> {
  try {
    const { data } = await weapiRequest<{ data: AnotherSongItem[] }>(
      "https://music.163.com/weapi/v1/radio/get",
      {}
    );
    return data.map((song) => solveAnotherSongItem(song));
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiPersonalized(): Promise<PlaylistItem[]> {
  const key = "personalized";
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
  try {
    const { result } = await weapiRequest<{ result: RawPlaylistItem[] }>(
      "https://music.163.com/weapi/personalized/playlist",
      { limit: 30, total: true, n: 1000 }
    );
    const ret = result.map((playlist) => solvePlaylistItem(playlist));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiPersonalizedNewsong(): Promise<SongsItem[]> {
  const key = "personalized_newsong";
  const value = apiCache.get(key);
  if (value) {
    return value as SongsItem[];
  }
  try {
    const { result } = await weapiRequest<{
      result: { song: AnotherSongItem }[];
    }>("https://music.163.com/weapi/personalized/newsong", {
      type: "recommend",
      limit: 10,
      areaId: 0,
    });
    const ret = result.map(({ song }) => solveAnotherSongItem(song));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiRecommendResource(): Promise<PlaylistItem[]> {
  const key = "recommend_resource";
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
  try {
    const { recommend } = await weapiRequest<{ recommend: RawPlaylistItem[] }>(
      "https://music.163.com/weapi/v1/discovery/recommend/resource",
      {}
    );
    const ret = recommend.map((playlist) => solvePlaylistItem(playlist));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiRecommendSongs(): Promise<SongsItem[]> {
  const key = "recommend_songs";
  const value = apiCache.get(key);
  if (value) {
    return value as SongsItem[];
  }
  try {
    const { data } = await weapiRequest<{ data: { dailySongs: SongsItem[] } }>(
      "https://music.163.com/api/v3/discovery/recommend/songs",
      {}
    );
    const ret = data.dailySongs.map((song) => solveSongItem(song));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiScrobble(
  id: number,
  sourceId: number,
  time: number
): Promise<void> {
  try {
    await weapiRequest("https://music.163.com/weapi/feedback/weblog", {
      logs: JSON.stringify([
        {
          action: "play",
          json: {
            download: 0,
            end: "playend",
            id,
            sourceId,
            time,
            type: "song",
            wifi: 0,
          },
        },
      ]),
    });
  } catch (err) {
    console.error(err);
  }
}

export async function apiUserDetail(
  uid: number
): Promise<UserDetail | undefined> {
  const key = `user_detail${uid}`;
  const value = apiCache.get(key);
  if (value) {
    return value as UserDetail;
  }
  try {
    const { profile } = await weapiRequest<{ profile: UserDetail }>(
      `https://music.163.com/weapi/v1/user/detail/${uid}`,
      {}
    );
    const ret = solveUserDetail(profile);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return undefined;
}

export async function apiUserFolloweds(
  userId: number,
  limit: number
): Promise<UserDetail[]> {
  const key = `user_followeds${userId}-${limit}`;
  const value = apiCache.get(key);
  if (value) {
    return value as UserDetail[];
  }
  try {
    const { followeds } = await eapiRequest<{ followeds: UserDetail[] }>(
      `https://music.163.com/eapi/user/getfolloweds/${userId}`,
      { userId, time: -1, limit },
      "/api/user/getfolloweds"
    );
    const ret = followeds.map((followed) => solveUserDetail(followed));
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiUserFollows(
  uid: number,
  limit: number,
  offset: number
): Promise<UserDetail[]> {
  const key = `user_follows${uid}-${limit}-${offset}`;
  const value = apiCache.get(key);
  if (value) {
    return value as UserDetail[];
  }
  try {
    const { follow } = await weapiRequest<{ follow: UserDetail[] }>(
      `https://music.163.com/weapi/user/getfollows/${uid}`,
      {
        offset,
        limit,
        order: true,
      }
    );
    const ret = follow.map((item) => solveUserDetail(item));
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

type UserLevel = {
  progress: number;
  level: number;
};

export async function apiUserLevel(): Promise<UserLevel> {
  const key = "user_level";
  const value = apiCache.get(key);
  if (value) {
    return value as UserLevel;
  }
  try {
    const {
      data: { progress, level },
    } = await weapiRequest<{ data: UserLevel }>(
      "https://music.163.com/weapi/user/level",
      {}
    );
    const ret = { progress, level };
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return {} as UserLevel;
}

export async function apiUserPlaylist(uid: number): Promise<PlaylistItem[]> {
  const key = `user_playlist${uid}`;
  const value = apiCache.get(key);
  if (value) {
    return value as PlaylistItem[];
  }
  try {
    const { playlist } = await weapiRequest<{
      playlist: RawPlaylistItem[];
    }>("https://music.163.com/api/user/playlist", {
      uid,
      limit: 30,
      offset: 0,
      includeVideo: true,
    });
    const ret = playlist.map((playlist) => solvePlaylistItem(playlist));
    if (ret.length > 0) {
      apiCache.set(key, ret);
    }
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiUserRecord(
  refresh?: true
): Promise<(SongsItem & { playCount: number })[][]> {
  const key = "user_record";
  let value: (SongsItem & { playCount: number })[][] | undefined;
  if (!refresh && (value = apiCache.get(key))) {
    return value;
  }
  const tasks: Promise<(SongsItem & { playCount: number })[]>[] = [];
  tasks.push(
    new Promise((resolve, reject) => {
      weapiRequest<{
        weekData: { playCount: number; song: SongsItem }[];
      }>("https://music.163.com/weapi/v1/play/record", {
        type: 1,
        uid: AccountManager.uid,
      })
        .then(({ weekData }) => {
          resolve(
            weekData.map(({ playCount, song }) => ({
              ...solveSongItem(song),
              playCount,
            }))
          );
        })
        .catch(reject);
    })
  );

  tasks.push(
    new Promise((resolve, reject) => {
      weapiRequest<{
        allData: { playCount: number; song: SongsItem }[];
      }>("https://music.163.com/weapi/v1/play/record", {
        type: 0,
        uid: AccountManager.uid,
      })
        .then(({ allData }) => {
          resolve(
            allData.map(({ playCount, song }) => ({
              ...solveSongItem(song),
              playCount,
            }))
          );
        })
        .catch(reject);
    })
  );
  try {
    const ret = await Promise.all(tasks);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}
