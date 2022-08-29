import {
  APPVER_COOKIE,
  AccountState,
  OS_PC_COOKIE,
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
import { APISetting } from "../helper";
import { CookieJar } from "tough-cookie";
import type { NeteaseTypings } from "api";
import { apiCache } from "../../cache";
import { logError } from "../../utils";

export function captchaSent(ctcode: string, cellphone: string): Promise<void> {
  return weapiRequest("music.163.com/weapi/sms/captcha/sent", {
    cellphone,
    ctcode,
  });
}

export async function dailyCheck(uid: number): Promise<boolean> {
  try {
    const actions = [];
    const [yunbei, sign] = await Promise.allSettled([
      yunbeiToday(uid),
      yunbeiInfo(uid),
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
  await weapiRequest(
    "music.163.com/weapi/point/dailyTask",
    { type: "0" },
    AccountState.cookies.get(uid)
  );
}

async function dailySigninWeb(uid: number): Promise<void> {
  await weapiRequest(
    "music.163.com/weapi/point/dailyTask",
    { type: "1" },
    AccountState.cookies.get(uid)
  );
}

export async function djPersonalizeRecommend(
  uid: number
): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = "dj_personalize_recommend";
  const value = apiCache.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    data: readonly NeteaseTypings.RadioDetail[];
  }>(
    "music.163.com/weapi/djradio/personalize/rcmd",
    { limit: 10 },
    AccountState.cookies.get(uid)
  );
  if (!res) return [];
  const ret = res.data.map(resolveRadioDetail);
  apiCache.set(key, ret);
  return ret;
}

export async function fmTrash(songId: number): Promise<boolean> {
  return !!(await weapiRequest(
    `music.163.com/weapi/radio/trash/add?alg=RT&songId=${songId}&time=25`,
    { songId }
  ));
}

export async function like(
  uid: number,
  trackId: number,
  like: boolean
): Promise<boolean> {
  const url = `${APISetting.apiProtocol}://music.163.com/weapi/radio/like`;
  const tmpJar = AccountState.cookies.get(uid)?.cloneSync() ?? new CookieJar();
  tmpJar.setCookieSync(APPVER_COOKIE, url);
  tmpJar.setCookieSync(OS_PC_COOKIE, url);
  return !!(await weapiRequest(
    "music.163.com/weapi/radio/like",
    { alg: "itembased", trackId, like, time: "3" },
    tmpJar
  ));
}

export async function likelist(uid: number): Promise<readonly number[]> {
  const key = `likelist${uid}`;
  const value = apiCache.get<readonly number[]>(key);
  if (value) return value;
  const res = await weapiRequest<{ ids: readonly number[] }>(
    "music.163.com/weapi/song/like/get",
    { uid },
    AccountState.cookies.get(uid)
  );
  if (!res) return [];
  apiCache.set(key, res.ids);
  return res.ids;
}

export function login(
  username: string,
  password: string
): Promise<NeteaseTypings.Profile | void> {
  return loginRequest("music.163.com/weapi/login", {
    username,
    password,
    rememberLogin: true,
  });
}

export function loginCellphone(
  phone: string,
  countrycode: string,
  password: string,
  captcha: string
): Promise<NeteaseTypings.Profile | void> {
  return loginRequest("music.163.com/weapi/login/cellphone", {
    phone,
    countrycode,
    rememberLogin: true,
    ...(captcha ? { captcha } : { password }),
  });
}

export function loginQrCheck(key: string): Promise<number | void> {
  return qrloginRequest("music.163.com/weapi/login/qrcode/client/login", {
    key,
    type: 1,
  });
}

export async function loginQrKey(): Promise<string | void> {
  const res = await weapiRequest<{ unikey: string }>(
    "music.163.com/weapi/login/qrcode/unikey",
    { type: 1 }
  );
  if (!res) return;
  return res.unikey;
}

export async function loginRefresh(cookieStr: string): Promise<string | void> {
  const cookie = CookieJar.deserializeSync(cookieStr);
  const res = await weapiRequest(
    "music.163.com/weapi/login/token/refresh",
    {},
    cookie
  );
  if (!res || !res.cookie) return;
  if (res.cookie) {
    const url = `${APISetting.apiProtocol}://music.163.com/weapi/login/token/refresh`;
    for (const c of res.cookie) cookie.setCookieSync(c, url);
  }
  return JSON.stringify(cookie.serializeSync());
}

export async function loginStatus(cookieStr: string): Promise<boolean> {
  const cookie = CookieJar.deserializeSync(cookieStr);
  const res = await weapiRequest<{
    readonly profile: NeteaseTypings.Profile;
  }>("music.163.com/weapi/w/nuser/account/get", {}, cookie);
  if (!res) return false;
  if (res.cookie) {
    const url = `${APISetting.apiProtocol}://music.163.com/weapi/w/nuser/account/get`;
    for (const c of res.cookie) cookie.setCookieSync(c, url);
  }
  const { profile } = res;
  AccountState.cookies.set(profile.userId, cookie);
  AccountState.profile.set(profile.userId, profile);
  return true;
}

export async function logout(uid: number): Promise<boolean> {
  const res = await weapiRequest(
    "music.163.com/weapi/logout",
    {},
    AccountState.cookies.get(uid)
  );
  if (!res) return false;
  AccountState.cookies.delete(uid);
  AccountState.profile.delete(uid);
  return true;
}

export async function personalFm(
  uid: number
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const res = await weapiRequest<{
    data: readonly NeteaseTypings.AnotherSongItem[];
  }>("music.163.com/weapi/v1/radio/get", {}, AccountState.cookies.get(uid));
  if (!res) return [];
  return res.data.map(resolveAnotherSongItem);
}

export async function personalized(
  uid: number
): Promise<readonly NeteaseTypings.PlaylistItem[]> {
  const key = "personalized";
  const value = apiCache.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    result: readonly NeteaseTypings.RawPlaylistItem[];
  }>(
    "music.163.com/weapi/personalized/playlist",
    { limit: 30, total: true, n: 1000 },
    AccountState.cookies.get(uid)
  );
  if (!res) return [];
  const ret = res.result.map(resolvePlaylistItem);
  apiCache.set(key, ret);
  return ret;
}

export async function personalizedDjprogram(
  uid: number
): Promise<readonly NeteaseTypings.ProgramDetail[]> {
  const key = "personalized_djprogram";
  const value = apiCache.get<readonly NeteaseTypings.ProgramDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    result: readonly { program: NeteaseTypings.RawProgramDetail }[];
  }>(
    "music.163.com/weapi/personalized/djprogram",
    {},
    AccountState.cookies.get(uid)
  );
  if (!res) return [];
  const ret = res.result.map(({ program }) => resolveProgramDetail(program));
  apiCache.set(key, ret);
  return ret;
}

export async function personalizedNewsong(
  uid: number
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = "personalized_newsong";
  const value = apiCache.get<readonly NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    result: readonly { song: NeteaseTypings.AnotherSongItem }[];
  }>(
    "music.163.com/weapi/personalized/newsong",
    { type: "recommend", limit: 10, areaId: 0 },
    AccountState.cookies.get(uid)
  );
  if (!res) return [];
  const ret = res.result.map(({ song }) => resolveAnotherSongItem(song));
  apiCache.set(key, ret);
  return ret;
}

export async function recommendResource(
  uid: number
): Promise<readonly NeteaseTypings.PlaylistItem[]> {
  const key = "recommend_resource";
  const value = apiCache.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    recommend: readonly NeteaseTypings.RawPlaylistItem[];
  }>(
    "music.163.com/weapi/v1/discovery/recommend/resource",
    {},
    AccountState.cookies.get(uid)
  );
  if (!res) return [];
  const ret = res.recommend.map(resolvePlaylistItem);
  apiCache.set(key, ret);
  return ret;
}

export async function recommendSongs(
  uid: number
): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = "recommend_songs";
  const value = apiCache.get<readonly NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    data: { dailySongs?: readonly NeteaseTypings.SongsItemSt[] };
  }>(
    "music.163.com/weapi/v3/discovery/recommend/songs",
    {},
    AccountState.cookies.get(uid)
  );
  if (!res || !res.data.dailySongs) return [];
  const ret = res.data.dailySongs.map(resolveSongItemSt);
  apiCache.set(key, ret);
  return ret;
}

export function scrobble(
  id: number,
  sourceId: number,
  time: number
): Promise<void> {
  return weapiRequest("music.163.com/weapi/feedback/weblog", {
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
          source: "list",
        },
      },
    ]),
  });
}

export async function userDetail(
  uid: number
): Promise<NeteaseTypings.UserDetail | void> {
  const key = `user_detail${uid}`;
  const value = apiCache.get<NeteaseTypings.UserDetail>(key);
  if (value) return value;
  const res = await weapiRequest<{
    profile: NeteaseTypings.UserDetail;
  }>(
    `music.163.com/weapi/v1/user/detail/${uid}`,
    {},
    AccountState.cookies.get(uid)
  );
  if (!res) return;
  const ret = resolveUserDetail(res.profile);
  return ret;
}

export async function userFolloweds(
  userId: number,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.UserDetail[]> {
  const key = `user_followeds${userId}-${limit}`;
  const value = apiCache.get<readonly NeteaseTypings.UserDetail[]>(key);
  if (value) return value;
  const res = await eapiRequest<{
    followeds: readonly NeteaseTypings.UserDetail[];
  }>(
    `music.163.com/eapi/user/getfolloweds/${userId}`,
    { userId, time: 0, limit, offset, getcounts: true },
    "/api/user/getfolloweds",
    AccountState.cookies.get(userId)
  );
  if (!res) return [];
  const ret = res.followeds.map(resolveUserDetail);
  return ret;
}

export async function userFollows(
  uid: number,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.UserDetail[]> {
  const key = `user_follows${uid}-${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.UserDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    follow: NeteaseTypings.UserDetail[];
  }>(
    `music.163.com/weapi/user/getfollows/${uid}`,
    { offset, limit, order: true },
    AccountState.cookies.get(uid)
  );
  if (!res) return [];
  const ret = res.follow.map(resolveUserDetail);
  return ret;
}

type UserLevel = { progress: number; level: number };

export async function userLevel(uid: number): Promise<UserLevel> {
  const key = "user_level";
  const value = apiCache.get<UserLevel>(key);
  if (value) return value;
  const res = await weapiRequest<{ data: UserLevel }>(
    "music.163.com/weapi/user/level",
    {},
    AccountState.cookies.get(uid)
  );
  if (!res) return {} as UserLevel;
  const {
    data: { progress, level },
  } = res;
  const ret = { progress, level };
  apiCache.set(key, ret, 0);
  return ret;
}

export async function userPlaylist(
  uid: number
): Promise<readonly NeteaseTypings.PlaylistItem[]> {
  const key = `user_playlist${uid}`;
  const value = apiCache.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    playlist: readonly NeteaseTypings.RawPlaylistItem[];
  }>(
    "music.163.com/weapi/user/playlist",
    { uid, limit: 30, offset: 0, includeVideo: true },
    AccountState.cookies.get(uid)
  );
  if (!res) return [];
  const ret = res.playlist.map(resolvePlaylistItem);
  if (ret.length > 0) {
    apiCache.set(key, ret);
  }
  return ret;
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
      const res = await weapiRequest<{
        weekData: readonly {
          playCount: number;
          song: NeteaseTypings.SongsItem;
        }[];
      }>(
        "music.163.com/weapi/v1/play/record",
        { type: 1, uid },
        AccountState.cookies.get(uid)
      );
      if (!res) throw Error("");
      return res.weekData.map(({ playCount, song }) => ({
        ...resolveSongItem(song),
        playCount,
      }));
    })(),
    (async () => {
      const res = await weapiRequest<{
        allData: readonly {
          playCount: number;
          song: NeteaseTypings.SongsItem;
        }[];
      }>(
        "music.163.com/weapi/v1/play/record",
        { type: 0, uid },
        AccountState.cookies.get(uid)
      );
      if (!res) throw Error("");
      return res.allData.map(({ playCount, song }) => ({
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
  const res = await weapiRequest<{
    mobileSign: boolean;
    pcSign: boolean;
  }>("music.163.com/weapi/v1/user/info", {}, AccountState.cookies.get(uid));
  if (!res) return { mobileSign: false, pcSign: false };
  const { mobileSign, pcSign } = res;
  return { mobileSign, pcSign };
}

async function yunbeiSign(uid: number): Promise<void> {
  await weapiRequest(
    "music.163.com/weapi/point/dailyTask",
    { type: "0" },
    AccountState.cookies.get(uid)
  );
}

async function yunbeiToday(uid: number): Promise<boolean> {
  const res = await weapiRequest<{ code: number }>(
    "music.163.com/weapi/point/today/get",
    {},
    AccountState.cookies.get(uid)
  );
  if (!res || res.code === 400) return false;
  return true;
}
