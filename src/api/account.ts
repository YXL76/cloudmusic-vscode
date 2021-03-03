import type {
  AnotherSongItem,
  PlaylistItem,
  ProgramDetail,
  RadioDetail,
  RawPlaylistItem,
  RawProgramDetail,
  RecordData,
  SongsItem,
  UserDetail,
} from "../constant";
import {
  eapiRequest,
  resolveAnotherSongItem,
  resolvePlaylistItem,
  resolveProgramDetail,
  resolveRadioDetail,
  resolveSongItem,
  resolveUserDetail,
  weapiRequest,
} from ".";
import { AccountManager } from "../manager";
import { apiCache } from "../util";

type Profile = { userId: number; nickname: string };

export async function apiDailySigninAndroid(): Promise<void> {
  try {
    await weapiRequest("https://music.163.com/weapi/point/dailyTask", {
      type: 0,
    });
  } catch (err) {
    console.error(err);
  }
}

export async function apiDailySigninWeb(): Promise<void> {
  try {
    await weapiRequest("https://music.163.com/weapi/point/dailyTask", {
      type: 1,
    });
  } catch (err) {
    console.error(err);
  }
}

export async function apiDjPersonalizeRecommend(): Promise<RadioDetail[]> {
  const key = "dj_personalize_recommend";
  const value = apiCache.get<RadioDetail[]>(key);
  if (value) return value;
  try {
    const { data } = await weapiRequest<{ data: RadioDetail[] }>(
      "https://music.163.com/api/djradio/personalize/rcmd",
      { limit: 10 }
    );
    const ret = data.map(resolveRadioDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
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
      "https://music.163.com/api/radio/like",
      {
        alg: "itembased",
        trackId,
        like,
        time: "3",
      },
      { os: "pc", appver: "2.7.1.198277" }
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

export async function apiLogin(
  username: string,
  password: string
): Promise<Profile | void> {
  try {
    const { profile } = await weapiRequest<{
      profile: Profile;
    }>(
      "https://music.163.com/weapi/login",
      { username, password, rememberLogin: "true" },
      { os: "pc" }
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
): Promise<Profile | void> {
  try {
    const { profile } = await weapiRequest<{
      profile: Profile;
    }>(
      "https://music.163.com/weapi/login/cellphone",
      { phone, countrycode, password, rememberLogin: "true" },
      { os: "pc" }
    );
    return profile;
  } catch (err) {
    console.error(err);
  }
  return;
}

export async function apiLoginQrCheck(key: string): Promise<number | void> {
  try {
    const { code } = await weapiRequest<{ code: number }>(
      "https://music.163.com/weapi/login/qrcode/client/login",
      { key, type: 1 }
    );
    return code;
  } catch {}
  return;
}

export async function apiLoginQrKey(): Promise<string | void> {
  try {
    const { unikey } = await weapiRequest<{ unikey: string }>(
      "https://music.163.com/weapi/login/qrcode/unikey",
      {
        type: 1,
      }
    );
    return unikey;
  } catch (err) {
    console.log(err);
  }
  return;
}

export async function apiLoginStatus(): Promise<Profile | void> {
  try {
    const { profile } = await weapiRequest<{
      profile: Profile;
    }>("https://music.163.com/weapi/w/nuser/account/get", {});
    if (profile && "userId" in profile && "nickname" in profile) return profile;
  } catch (err) {
    console.error(err);
  }
  return;
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
    return data.map(resolveAnotherSongItem);
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiPersonalized(): Promise<PlaylistItem[]> {
  const key = "personalized";
  const value = apiCache.get<PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { result } = await weapiRequest<{ result: RawPlaylistItem[] }>(
      "https://music.163.com/weapi/personalized/playlist",
      { limit: 30, total: true, n: 1000 }
    );
    const ret = result.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiPersonalizedDjprogram(): Promise<ProgramDetail[]> {
  const key = "personalized_djprogram";
  const value = apiCache.get<ProgramDetail[]>(key);
  if (value) return value;
  try {
    const { result } = await weapiRequest<{
      result: { program: RawProgramDetail }[];
    }>("https://music.163.com/weapi/personalized/djprogram", {});
    const ret = result.map(({ program }) => resolveProgramDetail(program));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiPersonalizedNewsong(): Promise<SongsItem[]> {
  const key = "personalized_newsong";
  const value = apiCache.get<SongsItem[]>(key);
  if (value) return value;
  try {
    const { result } = await weapiRequest<{
      result: { song: AnotherSongItem }[];
    }>("https://music.163.com/weapi/personalized/newsong", {
      type: "recommend",
      limit: 10,
      areaId: 0,
    });
    const ret = result.map(({ song }) => resolveAnotherSongItem(song));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiRecommendResource(): Promise<PlaylistItem[]> {
  const key = "recommend_resource";
  const value = apiCache.get<PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { recommend } = await weapiRequest<{ recommend: RawPlaylistItem[] }>(
      "https://music.163.com/weapi/v1/discovery/recommend/resource",
      {}
    );
    const ret = recommend.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiRecommendSongs(): Promise<SongsItem[]> {
  const key = "recommend_songs";
  const value = apiCache.get<SongsItem[]>(key);
  if (value) return value;
  try {
    const { data } = await weapiRequest<{ data: { dailySongs: SongsItem[] } }>(
      "https://music.163.com/api/v3/discovery/recommend/songs",
      {}
    );
    const ret = data.dailySongs.map(resolveSongItem);
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

export async function apiUserDetail(uid: number): Promise<UserDetail | void> {
  const key = `user_detail${uid}`;
  const value = apiCache.get<UserDetail>(key);
  if (value) return value;
  try {
    const { profile } = await weapiRequest<{ profile: UserDetail }>(
      `https://music.163.com/weapi/v1/user/detail/${uid}`,
      {}
    );
    const ret = resolveUserDetail(profile);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return;
}

export async function apiUserFolloweds(
  userId: number,
  limit: number,
  offset: number
): Promise<UserDetail[]> {
  const key = `user_followeds${userId}-${limit}`;
  const value = apiCache.get<UserDetail[]>(key);
  if (value) return value;
  try {
    const { followeds } = await eapiRequest<{ followeds: UserDetail[] }>(
      `https://music.163.com/eapi/user/getfolloweds/${userId}`,
      { userId, time: "0", limit, offset, getcounts: "true" },
      "/api/user/getfolloweds"
    );
    const ret = followeds.map(resolveUserDetail);
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
  const value = apiCache.get<UserDetail[]>(key);
  if (value) return value;
  try {
    const { follow } = await weapiRequest<{ follow: UserDetail[] }>(
      `https://music.163.com/weapi/user/getfollows/${uid}`,
      {
        offset,
        limit,
        order: true,
      }
    );
    const ret = follow.map(resolveUserDetail);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

type UserLevel = { progress: number; level: number };

export async function apiUserLevel(): Promise<UserLevel> {
  const key = "user_level";
  const value = apiCache.get<UserLevel>(key);
  if (value) return value;
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

export async function apiUserPlaylist(uid: number): Promise<PlaylistItem[]> {
  const key = `user_playlist${uid}`;
  const value = apiCache.get<PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { playlist } = await weapiRequest<{
      playlist: RawPlaylistItem[];
    }>("https://music.163.com/api/user/playlist", {
      uid,
      limit: 30,
      offset: 0,
      includeVideo: true,
    });
    const ret = playlist.map(resolvePlaylistItem);
    if (ret.length > 0) {
      apiCache.set(key, ret);
    }
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiUserRecord(): Promise<Array<RecordData[]>> {
  const key = `user_record$`;
  const value = apiCache.get<Array<RecordData[]>>(key);
  if (value) return value;
  const tasks: Promise<RecordData[]>[] = [
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
              ...resolveSongItem(song),
              playCount,
            }))
          );
        })
        .catch(reject);
    }),
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
              ...resolveSongItem(song),
              playCount,
            }))
          );
        })
        .catch(reject);
    }),
  ];

  try {
    const ret = await Promise.all(tasks);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [[], []];
}

export async function apiYunbeiInfo(): Promise<{
  mobileSign: boolean;
  pcSign: boolean;
}> {
  try {
    const { mobileSign, pcSign } = await weapiRequest<{
      mobileSign: boolean;
      pcSign: boolean;
    }>("https://music.163.com/api/v1/user/info", {});
    return { mobileSign, pcSign };
  } catch (err) {
    console.error(err);
  }
  return { mobileSign: false, pcSign: false };
}

export async function apiYunbeiSign(): Promise<void> {
  try {
    await weapiRequest("https://music.163.com/api/point/dailyTask", {
      type: 0,
    });
  } catch (err) {
    console.error(err);
  }
}

export async function apiYunbeiToday(): Promise<boolean> {
  try {
    const { code } = await weapiRequest<{ code: number }>(
      "https://music.163.com/api/point/today/get",
      {}
    );
    if (code === 400) return false;
  } catch (err) {
    console.error(err);
  }
  return true;
}
