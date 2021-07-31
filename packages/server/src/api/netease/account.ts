import {
  AccountState,
  resolveAnotherSongItem,
  resolvePlaylistItem,
  resolveProgramDetail,
  resolveRadioDetail,
  resolveSongItem,
  resolveSongItemSt,
  resolveUserDetail,
} from "./helper";
import {
  eapiRequest,
  loginRequest,
  qrloginRequest,
  weapiRequest,
} from "./request";
import type { NeteaseTypings } from "api";
import { apiCache } from "../../cache";
import { logError } from "../../utils";

export async function dailyCheck(uid: number): Promise<boolean> {
  try {
    const actions = [];
    const [yunbei, sign] = await Promise.allSettled([
      (() => yunbeiToday(uid))(),
      (() => yunbeiInfo(uid))(),
    ]);
    if (yunbei.status === "fulfilled" && !yunbei.value)
      actions.push(yunbeiSign(uid));
    if (sign.status === "fulfilled") {
      if (!sign.value.mobileSign) actions.push(dailySigninAndroid(uid));
      if (!sign.value.pcSign) actions.push(dailySigninWeb(uid));
    }
    await Promise.allSettled(actions);
    return true;
  } catch {}
  return false;
}

async function dailySigninAndroid(uid: number): Promise<void> {
  try {
    await weapiRequest(
      "music.163.com/weapi/point/dailyTask",
      { type: 0 },
      AccountState.cookies.get(uid)
    );
  } catch (err) {
    logError(err);
  }
}

async function dailySigninWeb(uid: number): Promise<void> {
  try {
    await weapiRequest(
      "music.163.com/weapi/point/dailyTask",
      { type: 1 },
      AccountState.cookies.get(uid)
    );
  } catch (err) {
    logError(err);
  }
}

export async function djPersonalizeRecommend(
  uid: number
): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = "dj_personalize_recommend";
  const value = apiCache.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  try {
    const { data } = await weapiRequest<{
      data: readonly NeteaseTypings.RadioDetail[];
    }>(
      "music.163.com/api/djradio/personalize/rcmd",
      { limit: 10 },
      AccountState.cookies.get(uid)
    );
    const ret = data.map(resolveRadioDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function fmTrash(songId: number): Promise<boolean> {
  try {
    await weapiRequest(
      `music.163.com/weapi/radio/trash/add?alg=RT&songId=${songId}&time=25`,
      { songId }
    );
    return true;
  } catch (err) {
    logError(err);
  }
  return false;
}

export async function like(
  uid: number,
  trackId: number,
  like: boolean
): Promise<boolean> {
  try {
    await weapiRequest(
      "music.163.com/api/radio/like",
      { alg: "itembased", trackId, like, time: "3" },
      { ...AccountState.cookies.get(uid), os: "pc", appver: "2.7.1.198277" }
    );
    return true;
  } catch (err) {
    logError(err);
  }
  return false;
}

export async function likelist(uid: number): Promise<readonly number[]> {
  try {
    const { ids } = await weapiRequest<{ ids: readonly number[] }>(
      "music.163.com/weapi/song/like/get",
      { uid },
      AccountState.cookies.get(uid)
    );
    return ids;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function login(
  username: string,
  password: string
): Promise<NeteaseTypings.Profile | void> {
  try {
    const profile = await loginRequest("music.163.com/weapi/login", {
      username,
      password,
      rememberLogin: "true",
    });
    return profile;
  } catch (err) {
    logError(err);
  }
  return;
}

export async function loginCellphone(
  phone: string,
  countrycode: string,
  password: string
): Promise<NeteaseTypings.Profile | void> {
  try {
    const profile = await loginRequest("music.163.com/weapi/login/cellphone", {
      phone,
      countrycode,
      password,
      rememberLogin: "true",
    });
    return profile;
  } catch (err) {
    logError(err);
  }
  return;
}

export async function loginQrCheck(key: string): Promise<number | void> {
  try {
    const code = await qrloginRequest(
      "music.163.com/weapi/login/qrcode/client/login",
      { key, type: 1 }
    );
    return code;
  } catch {}
  return;
}

export async function loginQrKey(): Promise<string | void> {
  try {
    const { unikey } = await weapiRequest<{ unikey: string }>(
      "music.163.com/weapi/login/qrcode/unikey",
      { type: 1 }
    );
    return unikey;
  } catch (err) {
    logError(err);
  }
  return;
}

export async function loginStatus(
  cookieStr: string
): Promise<NeteaseTypings.Profile | void> {
  try {
    const cookie = JSON.parse(cookieStr) as NeteaseTypings.Cookie;
    const { profile } = await weapiRequest<{ profile: NeteaseTypings.Profile }>(
      "music.163.com/weapi/w/nuser/account/get",
      {},
      cookie
    );
    AccountState.cookies.set(profile.userId, cookie);
    AccountState.profile.set(profile.userId, profile);
    return profile;
  } catch (err) {
    logError(err);
  }
  return;
}

export async function logout(uid: number): Promise<boolean> {
  try {
    await weapiRequest(
      "music.163.com/weapi/logout",
      {},
      AccountState.cookies.get(uid)
    );
    AccountState.cookies.delete(uid);
    AccountState.profile.delete(uid);
    return true;
  } catch (err) {
    logError(err);
  }
  return false;
}

export async function personalFm(
  uid: number
): Promise<readonly NeteaseTypings.SongsItem[]> {
  try {
    const { data } = await weapiRequest<{
      data: readonly NeteaseTypings.AnotherSongItem[];
    }>("music.163.com/weapi/v1/radio/get", {}, AccountState.cookies.get(uid));
    return data.map(resolveAnotherSongItem);
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function personalized(
  uid: number
): Promise<readonly NeteaseTypings.PlaylistItem[]> {
  const key = "personalized";
  const value = apiCache.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { result } = await weapiRequest<{
      result: readonly NeteaseTypings.RawPlaylistItem[];
    }>(
      "music.163.com/weapi/personalized/playlist",
      { limit: 30, total: true, n: 1000 },
      AccountState.cookies.get(uid)
    );
    const ret = result.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function personalizedDjprogram(
  uid: number
): Promise<readonly NeteaseTypings.ProgramDetail[]> {
  const key = "personalized_djprogram";
  const value = apiCache.get<readonly NeteaseTypings.ProgramDetail[]>(key);
  if (value) return value;
  try {
    const { result } = await weapiRequest<{
      result: readonly { program: NeteaseTypings.RawProgramDetail }[];
    }>(
      "music.163.com/weapi/personalized/djprogram",
      {},
      AccountState.cookies.get(uid)
    );
    const ret = result.map(({ program }) => resolveProgramDetail(program));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function personalizedNewsong(
  uid: number
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = "personalized_newsong";
  const value = apiCache.get<readonly NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  try {
    const { result } = await weapiRequest<{
      result: readonly { song: NeteaseTypings.AnotherSongItem }[];
    }>(
      "music.163.com/weapi/personalized/newsong",
      { type: "recommend", limit: 10, areaId: 0 },
      AccountState.cookies.get(uid)
    );
    const ret = result.map(({ song }) => resolveAnotherSongItem(song));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function recommendResource(
  uid: number
): Promise<readonly NeteaseTypings.PlaylistItem[]> {
  const key = "recommend_resource";
  const value = apiCache.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { recommend } = await weapiRequest<{
      recommend: readonly NeteaseTypings.RawPlaylistItem[];
    }>(
      "music.163.com/weapi/v1/discovery/recommend/resource",
      {},
      AccountState.cookies.get(uid)
    );
    const ret = recommend.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function recommendSongs(
  uid: number
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = "recommend_songs";
  const value = apiCache.get<readonly NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  try {
    const { data } = await weapiRequest<{
      data: { dailySongs: readonly NeteaseTypings.SongsItemSt[] };
    }>(
      "music.163.com/api/v3/discovery/recommend/songs",
      {},
      AccountState.cookies.get(uid)
    );
    const ret = data.dailySongs.map(resolveSongItemSt);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function scrobble(
  id: number,
  sourceId: number,
  time: number
): Promise<void> {
  try {
    await weapiRequest("music.163.com/weapi/feedback/weblog", {
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
    logError(err);
  }
}

export async function userDetail(
  uid: number
): Promise<NeteaseTypings.UserDetail | void> {
  const key = `user_detail${uid}`;
  const value = apiCache.get<NeteaseTypings.UserDetail>(key);
  if (value) return value;
  try {
    const { profile } = await weapiRequest<{
      profile: NeteaseTypings.UserDetail;
    }>(
      `music.163.com/weapi/v1/user/detail/${uid}`,
      {},
      AccountState.cookies.get(uid)
    );
    const ret = resolveUserDetail(profile);
    return ret;
  } catch (err) {
    logError(err);
  }
  return;
}

export async function userFolloweds(
  userId: number,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.UserDetail[]> {
  const key = `user_followeds${userId}-${limit}`;
  const value = apiCache.get<readonly NeteaseTypings.UserDetail[]>(key);
  if (value) return value;
  try {
    const { followeds } = await eapiRequest<{
      followeds: readonly NeteaseTypings.UserDetail[];
    }>(
      `music.163.com/eapi/user/getfolloweds/${userId}`,
      { userId, time: "0", limit, offset, getcounts: "true" },
      "/api/user/getfolloweds",
      AccountState.cookies.get(userId)
    );
    const ret = followeds.map(resolveUserDetail);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function userFollows(
  uid: number,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.UserDetail[]> {
  const key = `user_follows${uid}-${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.UserDetail[]>(key);
  if (value) return value;
  try {
    const { follow } = await weapiRequest<{
      follow: NeteaseTypings.UserDetail[];
    }>(
      `music.163.com/weapi/user/getfollows/${uid}`,
      { offset, limit, order: true },
      AccountState.cookies.get(uid)
    );
    const ret = follow.map(resolveUserDetail);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

type UserLevel = { progress: number; level: number };

export async function userLevel(uid: number): Promise<UserLevel> {
  const key = "user_level";
  const value = apiCache.get<UserLevel>(key);
  if (value) return value;
  try {
    const {
      data: { progress, level },
    } = await weapiRequest<{ data: UserLevel }>(
      "music.163.com/weapi/user/level",
      {},
      AccountState.cookies.get(uid)
    );
    const ret = { progress, level };
    apiCache.set(key, ret, 0);
    return ret;
  } catch (err) {
    logError(err);
  }
  return {} as UserLevel;
}

export async function userPlaylist(
  uid: number
): Promise<readonly NeteaseTypings.PlaylistItem[]> {
  const key = `user_playlist${uid}`;
  const value = apiCache.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { playlist } = await weapiRequest<{
      playlist: readonly NeteaseTypings.RawPlaylistItem[];
    }>(
      "music.163.com/api/user/playlist",
      { uid, limit: 30, offset: 0, includeVideo: true },
      AccountState.cookies.get(uid)
    );
    const ret = playlist.map(resolvePlaylistItem);
    if (ret.length > 0) {
      apiCache.set(key, ret);
    }
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function userRecord(
  uid: number
): Promise<ReadonlyArray<readonly NeteaseTypings.RecordData[]>> {
  const key = `user_record${uid}`;
  const value =
    apiCache.get<ReadonlyArray<readonly NeteaseTypings.RecordData[]>>(key);
  if (value) return value;

  const tasks: readonly Promise<readonly NeteaseTypings.RecordData[]>[] = [
    (async () => {
      const { weekData } = await weapiRequest<{
        weekData: readonly {
          playCount: number;
          song: NeteaseTypings.SongsItem;
        }[];
      }>(
        "music.163.com/weapi/v1/play/record",
        { type: 1, uid },
        AccountState.cookies.get(uid)
      );
      return weekData.map(({ playCount, song }) => ({
        ...resolveSongItem(song),
        playCount,
      }));
    })(),
    (async () => {
      const { allData } = await weapiRequest<{
        allData: readonly {
          playCount: number;
          song: NeteaseTypings.SongsItem;
        }[];
      }>(
        "music.163.com/weapi/v1/play/record",
        { type: 0, uid },
        AccountState.cookies.get(uid)
      );
      return allData.map(({ playCount, song }) => ({
        ...resolveSongItem(song),
        playCount,
      }));
    })(),
  ];

  try {
    const ret = await Promise.all(tasks);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [[], []];
}

async function yunbeiInfo(uid: number): Promise<{
  mobileSign: boolean;
  pcSign: boolean;
}> {
  try {
    const { mobileSign, pcSign } = await weapiRequest<{
      mobileSign: boolean;
      pcSign: boolean;
    }>("music.163.com/api/v1/user/info", {}, AccountState.cookies.get(uid));
    return { mobileSign, pcSign };
  } catch (err) {
    logError(err);
  }
  return { mobileSign: false, pcSign: false };
}

async function yunbeiSign(uid: number): Promise<void> {
  try {
    await weapiRequest(
      "music.163.com/api/point/dailyTask",
      {
        type: 0,
      },
      AccountState.cookies.get(uid)
    );
  } catch (err) {
    logError(err);
  }
}

async function yunbeiToday(uid: number): Promise<boolean> {
  try {
    const { code } = await weapiRequest<{ code: number }>(
      "music.163.com/api/point/today/get",
      {},
      AccountState.cookies.get(uid)
    );
    if (code === 400) return false;
  } catch (err) {
    logError(err);
  }
  return true;
}
