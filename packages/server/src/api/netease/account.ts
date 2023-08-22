import {
  ACCOUNT_STATE,
  resolveAnotherSongItem,
  resolvePlaylistItem,
  resolveProgramDetail,
  resolveRadioDetail,
  resolveSongItem,
  resolveUserDetail,
} from "./helper.js";
import { eapiRequest, loginRequest, qrloginRequest, weapiRequest } from "./request.js";
import { API_CACHE } from "../../cache.js";
import { API_CONFIG } from "../helper.js";
import { CookieJar } from "tough-cookie";
import type { NeteaseTypings } from "api";
import { logError } from "../../utils.js";

export function captchaSent(ctcode: string, cellphone: string): Promise<void> {
  return weapiRequest("music.163.com/weapi/sms/captcha/sent", { cellphone, ctcode });
}

type CountryList = readonly { code: string; en: string; locale: string; zh: string }[];
export async function countriesCodeList(): Promise<CountryList> {
  const key = "countries_code_list";
  const value = API_CACHE.get<CountryList>(key);
  if (value) return value;

  const res = await eapiRequest<{
    data: { countryList: CountryList; label: string }[];
  }>("interface3.music.163.com/eapi/lbs/countries/v1", {}, "/api/lbs/countries/v1");
  if (!res || !res.data) {
    return [
      { zh: "中国", en: "China", locale: "CN", code: "86" },
      { zh: "中国香港", en: "Hongkong", locale: "HK", code: "852" },
      { zh: "中国澳门", en: "Macao", locale: "MO", code: "853" },
      { zh: "中国台湾", en: "Taiwan", locale: "TW", code: "886" },
    ];
  }

  const ret = res.data.map(({ countryList }) => countryList).flat();
  API_CACHE.set(key, ret, 0);
  return ret;
}

export async function dailyCheck(uid: number): Promise<boolean> {
  const actions = [];
  const [yunbei, sign] = await Promise.allSettled([yunbeiToday(uid), yunbeiInfo(uid)]);
  if (yunbei.status === "fulfilled" && !yunbei.value) actions.push(yunbeiSign(uid));
  if (sign.status === "fulfilled") {
    if (!sign.value.mobileSign) actions.push(dailySigninAndroid(uid));
    if (!sign.value.pcSign) actions.push(dailySigninWeb(uid));
  }
  const res = await Promise.allSettled(actions);
  return (
    yunbei.status === "fulfilled" &&
    sign.status === "fulfilled" &&
    res.reduce((a, b) => a && b.status === "fulfilled", true)
  );
}

function dailySigninAndroid(uid: number): Promise<void> {
  return weapiRequest("music.163.com/weapi/point/dailyTask", { type: "0" }, ACCOUNT_STATE.cookies.get(uid));
}

function dailySigninWeb(uid: number): Promise<void> {
  return weapiRequest("music.163.com/weapi/point/dailyTask", { type: "1" }, ACCOUNT_STATE.cookies.get(uid));
}

export async function djPersonalizeRecommend(uid: number): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = "dj_personalize_recommend";
  const value = API_CACHE.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    data: readonly NeteaseTypings.RadioDetail[];
  }>("music.163.com/weapi/djradio/personalize/rcmd", { limit: 10 }, ACCOUNT_STATE.cookies.get(uid));
  if (!res) return [];
  const ret = res.data.map(resolveRadioDetail);
  API_CACHE.set(key, ret);
  return ret;
}

export async function fmTrash(songId: number): Promise<boolean> {
  return !!(await weapiRequest(`music.163.com/weapi/radio/trash/add?alg=RT&songId=${songId}&time=25`, { songId }));
}

export async function like(uid: number, trackId: number, like: boolean): Promise<boolean> {
  return !!(await weapiRequest(
    "music.163.com/weapi/radio/like",
    { alg: "itembased", trackId, like, time: "3" },
    ACCOUNT_STATE.cookies.get(uid),
  ));
}

export async function likelist(uid: number): Promise<readonly number[]> {
  const key = `likelist${uid}`;
  const value = API_CACHE.get<readonly number[]>(key);
  if (value) return value;
  const res = await weapiRequest<{ ids: readonly number[] }>(
    "music.163.com/weapi/song/like/get",
    { uid },
    ACCOUNT_STATE.cookies.get(uid),
  );
  if (!res) return [];
  API_CACHE.set(key, res.ids);
  return res.ids;
}

export function login(username: string, password: string): Promise<NeteaseTypings.Profile | void> {
  return loginRequest("music.163.com/weapi/login", { username, password, rememberLogin: true });
}

export function loginCellphone(
  phone: string,
  countrycode: string,
  password: string,
  captcha: string,
): Promise<NeteaseTypings.Profile | void> {
  return loginRequest("music.163.com/weapi/login/cellphone", {
    phone,
    countrycode,
    rememberLogin: true,
    ...(captcha ? { captcha } : { password }),
  });
}

export function loginQrCheck(key: string) {
  return qrloginRequest("music.163.com/weapi/login/qrcode/client/login", { key, type: 1 });
}

export async function loginQrKey(): Promise<string | void> {
  const res = await weapiRequest<{ unikey: string }>("music.163.com/weapi/login/qrcode/unikey", { type: 1 });
  if (!res) return;
  return res.unikey;
}

export async function loginRefresh(cookieStr: string): Promise<string | void> {
  const cookie = CookieJar.deserializeSync(cookieStr);
  const res = await weapiRequest("music.163.com/weapi/login/token/refresh", {}, cookie);
  if (!res || !res.cookie) return;
  if (res.cookie) for (const c of res.cookie) cookie.setCookieSync(c, "http://music.163.com/weapi/login/token/refresh");
  return JSON.stringify(cookie.serializeSync());
}

export async function loginStatus(cookieStr: string): Promise<boolean> {
  const cookie = CookieJar.deserializeSync(cookieStr);
  const res = await weapiRequest<{
    readonly profile: NeteaseTypings.Profile;
  }>("music.163.com/weapi/w/nuser/account/get", {}, cookie);
  if (!res) return false;
  if (res.cookie) {
    const url = `${API_CONFIG.protocol}://music.163.com/weapi/w/nuser/account/get`;
    for (const c of res.cookie) cookie.setCookieSync(c, url);
  }
  const { profile } = res;
  ACCOUNT_STATE.setStaticCookie(cookie);
  ACCOUNT_STATE.cookies.set(profile.userId, cookie);
  ACCOUNT_STATE.profile.set(profile.userId, profile);
  return true;
}

export async function logout(uid: number): Promise<boolean> {
  const res = await weapiRequest("music.163.com/weapi/logout", {}, ACCOUNT_STATE.cookies.get(uid));
  if (!res) return false;
  ACCOUNT_STATE.cookies.delete(uid);
  ACCOUNT_STATE.profile.delete(uid);
  return true;
}

const fmSongsCache = new Map<number, NeteaseTypings.SongsItem[]>();
async function _personalFm(uid: number): Promise<void> {
  if (!fmSongsCache.has(uid)) fmSongsCache.set(uid, []);
  const songs = fmSongsCache.get(uid);
  if (songs) {
    const res = await weapiRequest<{
      data: readonly NeteaseTypings.AnotherSongItem[];
    }>("music.163.com/weapi/v1/radio/get", {}, ACCOUNT_STATE.cookies.get(uid));
    if (res) songs.push(...res.data.map(resolveAnotherSongItem));
  }
}
export async function personalFm(uid: number, next: boolean): Promise<NeteaseTypings.SongsItem | undefined> {
  if (fmSongsCache.get(uid)?.length || 0 <= 1) await _personalFm(uid);
  const songs = fmSongsCache.get(uid);
  if (!songs) return;
  if (next) songs.shift();
  return songs[0];
}

export async function personalFmNext(uid: number): Promise<NeteaseTypings.SongsItem | undefined> {
  const songs = fmSongsCache.get(uid);
  if (!songs || songs.length <= 1) await _personalFm(uid);
  return fmSongsCache.get(uid)?.at(1);
}

export async function personalized(uid: number): Promise<readonly NeteaseTypings.PlaylistItem[]> {
  const key = "personalized";
  const value = API_CACHE.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    result: readonly NeteaseTypings.RawPlaylistItem[];
  }>("music.163.com/weapi/personalized/playlist", { limit: 30, total: true, n: 1000 }, ACCOUNT_STATE.cookies.get(uid));
  if (!res) return [];
  const ret = res.result.map(resolvePlaylistItem);
  API_CACHE.set(key, ret);
  return ret;
}

export async function personalizedDjprogram(uid: number): Promise<readonly NeteaseTypings.ProgramDetail[]> {
  const key = "personalized_djprogram";
  const value = API_CACHE.get<readonly NeteaseTypings.ProgramDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    result: readonly { program: NeteaseTypings.RawProgramDetail }[];
  }>("music.163.com/weapi/personalized/djprogram", {}, ACCOUNT_STATE.cookies.get(uid));
  if (!res) return [];
  const ret = res.result.map(({ program }) => resolveProgramDetail(program));
  API_CACHE.set(key, ret);
  return ret;
}

export async function personalizedNewsong(uid: number): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = "personalized_newsong";
  const value = API_CACHE.get<readonly NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    result: readonly { song: NeteaseTypings.AnotherSongItem }[];
  }>(
    "music.163.com/weapi/personalized/newsong",
    { type: "recommend", limit: 10, areaId: 0 },
    ACCOUNT_STATE.cookies.get(uid),
  );
  if (!res) return [];
  const ret = res.result.map(({ song }) => resolveAnotherSongItem(song));
  API_CACHE.set(key, ret);
  return ret;
}

export async function recommendResource(uid: number): Promise<readonly NeteaseTypings.PlaylistItem[]> {
  const key = "recommend_resource";
  const value = API_CACHE.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    recommend: readonly NeteaseTypings.RawPlaylistItem[];
  }>("music.163.com/weapi/v1/discovery/recommend/resource", {}, ACCOUNT_STATE.cookies.get(uid));
  if (!res) return [];
  const ret = res.recommend.map(resolvePlaylistItem);
  API_CACHE.set(key, ret);
  return ret;
}

export async function recommendSongs(uid: number): Promise<readonly NeteaseTypings.SongsItem[]> {
  const key = "recommend_songs";
  const value = API_CACHE.get<readonly NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    data: { dailySongs?: readonly NeteaseTypings.SongsItemSt[] };
  }>("music.163.com/weapi/v3/discovery/recommend/songs", {}, ACCOUNT_STATE.cookies.get(uid));
  if (!res || !res.data.dailySongs) return [];
  const ret = res.data.dailySongs.map(resolveSongItem);
  API_CACHE.set(key, ret);
  return ret;
}

export function scrobble(id: number, sourceId: number, time: number): Promise<void> {
  return weapiRequest("music.163.com/weapi/feedback/weblog", {
    logs: JSON.stringify([
      {
        action: "play",
        json: { download: 0, end: "playend", id, sourceId, time, type: "song", wifi: 0, source: "list" },
      },
    ]),
  });
}

export async function userDetail(uid: number): Promise<NeteaseTypings.UserDetail | void> {
  const key = `user_detail${uid}`;
  const value = API_CACHE.get<NeteaseTypings.UserDetail>(key);
  if (value) return value;
  const res = await weapiRequest<{
    profile: NeteaseTypings.UserDetail;
  }>(`music.163.com/weapi/v1/user/detail/${uid}`, {}, ACCOUNT_STATE.cookies.get(uid));
  if (!res) return;
  const ret = resolveUserDetail(res.profile);
  return ret;
}

export async function userFolloweds(
  userId: number,
  limit: number,
  offset: number,
): Promise<readonly NeteaseTypings.UserDetail[]> {
  const key = `user_followeds${userId}-${limit}`;
  const value = API_CACHE.get<readonly NeteaseTypings.UserDetail[]>(key);
  if (value) return value;
  const res = await eapiRequest<{
    followeds: readonly NeteaseTypings.UserDetail[];
  }>(
    `music.163.com/eapi/user/getfolloweds/${userId}`,
    { userId, time: 0, limit, offset, getcounts: true },
    "/api/user/getfolloweds",
    ACCOUNT_STATE.cookies.get(userId),
  );
  if (!res) return [];
  const ret = res.followeds.map(resolveUserDetail);
  return ret;
}

export async function userFollows(
  uid: number,
  limit: number,
  offset: number,
): Promise<readonly NeteaseTypings.UserDetail[]> {
  const key = `user_follows${uid}-${limit}-${offset}`;
  const value = API_CACHE.get<readonly NeteaseTypings.UserDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    follow: NeteaseTypings.UserDetail[];
  }>(`music.163.com/weapi/user/getfollows/${uid}`, { offset, limit, order: true }, ACCOUNT_STATE.cookies.get(uid));
  if (!res) return [];
  const ret = res.follow.map(resolveUserDetail);
  return ret;
}

type UserLevel = { progress: number; level: number };

export async function userLevel(uid: number): Promise<UserLevel> {
  const key = "user_level";
  const value = API_CACHE.get<UserLevel>(key);
  if (value) return value;
  const res = await weapiRequest<{ data: UserLevel }>(
    "music.163.com/weapi/user/level",
    {},
    ACCOUNT_STATE.cookies.get(uid),
  );
  if (!res) return <UserLevel>{};
  const {
    data: { progress, level },
  } = res;
  const ret = { progress, level };
  API_CACHE.set(key, ret, 0);
  return ret;
}

export async function userPlaylist(uid: number): Promise<readonly NeteaseTypings.PlaylistItem[]> {
  const key = `user_playlist${uid}`;
  const value = API_CACHE.get<readonly NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    playlist: readonly NeteaseTypings.RawPlaylistItem[];
  }>(
    "music.163.com/weapi/user/playlist",
    { uid, limit: 30, offset: 0, includeVideo: true },
    ACCOUNT_STATE.cookies.get(uid),
  );
  if (!res) return [];
  const ret = res.playlist.map(resolvePlaylistItem);
  if (ret.length > 0) API_CACHE.set(key, ret);
  return ret;
}

export async function userRecord(uid: number): Promise<ReadonlyArray<readonly NeteaseTypings.RecordData[]>> {
  const key = `user_record${uid}`;
  const value = API_CACHE.get<ReadonlyArray<readonly NeteaseTypings.RecordData[]>>(key);
  if (value) return value;

  const tasks: readonly Promise<readonly NeteaseTypings.RecordData[]>[] = [
    (async () => {
      const res = await weapiRequest<{ weekData: readonly { playCount: number; song: NeteaseTypings.SongsItem }[] }>(
        "music.163.com/weapi/v1/play/record",
        { type: 1, uid },
        ACCOUNT_STATE.cookies.get(uid),
      );
      if (!res) throw Error("");
      return res.weekData.map(({ playCount, song }) => ({ ...resolveSongItem(song), playCount }));
    })(),
    (async () => {
      const res = await weapiRequest<{ allData: readonly { playCount: number; song: NeteaseTypings.SongsItem }[] }>(
        "music.163.com/weapi/v1/play/record",
        { type: 0, uid },
        ACCOUNT_STATE.cookies.get(uid),
      );
      if (!res) throw Error("");
      return res.allData.map(({ playCount, song }) => ({ ...resolveSongItem(song), playCount }));
    })(),
  ];

  try {
    const ret = await Promise.all(tasks);
    API_CACHE.set(key, ret);
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
  }>("music.163.com/weapi/v1/user/info", {}, ACCOUNT_STATE.cookies.get(uid));
  if (!res) return { mobileSign: false, pcSign: false };
  const { mobileSign, pcSign } = res;
  return { mobileSign, pcSign };
}

async function yunbeiSign(uid: number): Promise<void> {
  await weapiRequest("music.163.com/weapi/point/dailyTask", { type: "0" }, ACCOUNT_STATE.cookies.get(uid));
}

async function yunbeiToday(uid: number): Promise<boolean> {
  const res = await weapiRequest<{ code: number }>(
    "music.163.com/weapi/point/today/get",
    {},
    ACCOUNT_STATE.cookies.get(uid),
  );
  return !!(res && res.code !== 400);
}
