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

export async function apiDailySignin() {
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

export async function apiFmTrash(songId: number) {
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

export async function apiLike(trackId: number, like: boolean) {
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

export async function apiLikelist() {
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

export async function apiLogin(username: string, password: string) {
  try {
    const { profile } = await weapiRequest<{
      profile: { userId: number; nickname: string };
    }>(
      "https://music.163.com/weapi/login",
      { username, password, rememberLogin: "true" },
      "pc"
    );
    return profile;
  } catch (err) {
    console.error(err);
  }
  return;
}

export async function apiLoginCellphone(
  phone: string,
  countrycode: string,
  password: string
) {
  try {
    const { profile } = await weapiRequest<{
      profile: { userId: number; nickname: string };
    }>(
      "https://music.163.com/weapi/login/cellphone",
      { phone, countrycode, password, rememberLogin: "true" },
      "pc"
    );
    return profile;
  } catch (err) {
    console.error(err);
  }
  return;
}

export async function apiLoginQrCheck(key: string) {
  try {
    const { code } = await weapiRequest<{ code: number }>(
      "https://music.163.com/weapi/login/qrcode/client/login",
      { key, type: 1 }
    );
    return code;
  } catch {}
  return;
}

export async function apiLoginQrKey() {
  try {
    const { unikey } = await weapiRequest<{ unikey: string }>(
      "https://music.163.com/weapi/login/qrcode/unikey",
      {
        type: 1,
      }
    );
    return unikey;
  } catch (err) {}
  return;
}

export async function apiLoginStatus() {
  try {
    const { profile } = await weapiRequest<{
      profile: { userId: number; nickname: string };
    }>("https://music.163.com/weapi/w/nuser/account/get", {});
    if (profile && "userId" in profile && "nickname" in profile) return profile;
  } catch (err) {
    console.error(err);
  }
  return;
}

export async function apiLogout() {
  try {
    await weapiRequest("https://music.163.com/weapi/logout", {});
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiPersonalFm() {
  try {
    const { data } = await weapiRequest<{ data: AnotherSongItem[] }>(
      "https://music.163.com/weapi/v1/radio/get",
      {}
    );
    return data.map(solveAnotherSongItem);
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiPersonalized() {
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
    const ret = result.map(solvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiPersonalizedNewsong() {
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

export async function apiRecommendResource() {
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
    const ret = recommend.map(solvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiRecommendSongs() {
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
    const ret = data.dailySongs.map(solveSongItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiScrobble(id: number, sourceId: number, time: number) {
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

export async function apiUserDetail(uid: number) {
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
  return;
}

export async function apiUserFolloweds(userId: number, limit: number) {
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
    const ret = followeds.map(solveUserDetail);
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
) {
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
    const ret = follow.map(solveUserDetail);
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

export async function apiUserLevel() {
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
    apiCache.set(key, ret, 0);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return {} as UserLevel;
}

export async function apiUserPlaylist(uid: number) {
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
    const ret = playlist.map(solvePlaylistItem);
    if (ret.length > 0) {
      apiCache.set(key, ret);
    }
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiUserRecord(refresh?: true) {
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
