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
import { eapiRequest, weapiRequest } from "./request";
import type { NeteaseTypings } from "api";
import { apiCache } from "../..";

type Profile = { userId: number; nickname: string };

export async function dailyCheck(): Promise<boolean> {
  try {
    const actions = [];
    const [yunbei, sign] = await Promise.allSettled([
      yunbeiToday(),
      yunbeiInfo(),
    ]);
    if (yunbei.status === "fulfilled" && !yunbei.value)
      actions.push(yunbeiSign());
    if (sign.status === "fulfilled") {
      if (!sign.value.mobileSign) actions.push(dailySigninAndroid());
      if (!sign.value.pcSign) actions.push(dailySigninWeb());
    }
    await Promise.allSettled(actions);
    return true;
  } catch {}
  return false;
}

async function dailySigninAndroid(): Promise<void> {
  try {
    await weapiRequest("https://music.163.com/weapi/point/dailyTask", {
      type: 0,
    });
  } catch (err) {
    console.error(err);
  }
}

async function dailySigninWeb(): Promise<void> {
  try {
    await weapiRequest("https://music.163.com/weapi/point/dailyTask", {
      type: 1,
    });
  } catch (err) {
    console.error(err);
  }
}

export async function djPersonalizeRecommend(): Promise<
  NeteaseTypings.RadioDetail[]
> {
  const key = "dj_personalize_recommend";
  const value = apiCache.get<NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  try {
    const { data } = await weapiRequest<{ data: NeteaseTypings.RadioDetail[] }>(
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

export async function fmTrash(songId: number): Promise<boolean> {
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

export async function like(trackId: number, like: boolean): Promise<boolean> {
  try {
    await weapiRequest(
      "https://music.163.com/api/radio/like",
      { alg: "itembased", trackId, like, time: "3" },
      { os: "pc", appver: "2.7.1.198277" }
    );
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function likelist(): Promise<number[]> {
  try {
    const { ids } = await weapiRequest<{ ids: number[] }>(
      "https://music.163.com/weapi/song/like/get",
      { uid: AccountState.uid }
    );
    return ids;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function login(
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

export async function loginCellphone(
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

export async function loginQrCheck(key: string): Promise<number | void> {
  try {
    const { code } = await weapiRequest<{ code: number }>(
      "https://music.163.com/weapi/login/qrcode/client/login",
      { key, type: 1 }
    );
    return code;
  } catch {}
  return;
}

export async function loginQrKey(): Promise<string | void> {
  try {
    const { unikey } = await weapiRequest<{ unikey: string }>(
      "https://music.163.com/weapi/login/qrcode/unikey",
      { type: 1 }
    );
    return unikey;
  } catch (err) {
    console.error(err);
  }
  return;
}

export async function loginStatus(cookieStr?: string): Promise<Profile | void> {
  const key = "loginStatus";
  const value = apiCache.get<Profile>(key);
  if (value) return value;
  if (cookieStr)
    AccountState.cookie = JSON.parse(cookieStr) as NeteaseTypings.Cookie;
  try {
    const { profile } = await weapiRequest<{
      profile: Profile;
    }>("https://music.163.com/weapi/w/nuser/account/get", {});
    if (profile && "userId" in profile && "nickname" in profile) return profile;
    apiCache.set(key, profile);
  } catch (err) {
    console.error(err);
  }
  return;
}

export async function logout(): Promise<boolean> {
  try {
    await weapiRequest("https://music.163.com/weapi/logout", {});
    AccountState.cookie = {};
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function personalFm(): Promise<NeteaseTypings.SongsItem[]> {
  try {
    const { data } = await weapiRequest<{
      data: NeteaseTypings.AnotherSongItem[];
    }>("https://music.163.com/weapi/v1/radio/get", {});
    return data.map(resolveAnotherSongItem);
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function personalized(): Promise<NeteaseTypings.PlaylistItem[]> {
  const key = "personalized";
  const value = apiCache.get<NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { result } = await weapiRequest<{
      result: NeteaseTypings.RawPlaylistItem[];
    }>("https://music.163.com/weapi/personalized/playlist", {
      limit: 30,
      total: true,
      n: 1000,
    });
    const ret = result.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function personalizedDjprogram(): Promise<
  NeteaseTypings.ProgramDetail[]
> {
  const key = "personalized_djprogram";
  const value = apiCache.get<NeteaseTypings.ProgramDetail[]>(key);
  if (value) return value;
  try {
    const { result } = await weapiRequest<{
      result: { program: NeteaseTypings.RawProgramDetail }[];
    }>("https://music.163.com/weapi/personalized/djprogram", {});
    const ret = result.map(({ program }) => resolveProgramDetail(program));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function personalizedNewsong(): Promise<
  NeteaseTypings.SongsItem[]
> {
  const key = "personalized_newsong";
  const value = apiCache.get<NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  try {
    const { result } = await weapiRequest<{
      result: { song: NeteaseTypings.AnotherSongItem }[];
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

export async function recommendResource(): Promise<
  NeteaseTypings.PlaylistItem[]
> {
  const key = "recommend_resource";
  const value = apiCache.get<NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { recommend } = await weapiRequest<{
      recommend: NeteaseTypings.RawPlaylistItem[];
    }>("https://music.163.com/weapi/v1/discovery/recommend/resource", {});
    const ret = recommend.map(resolvePlaylistItem);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function recommendSongs(): Promise<NeteaseTypings.SongsItem[]> {
  const key = "recommend_songs";
  const value = apiCache.get<NeteaseTypings.SongsItem[]>(key);
  if (value) return value;
  try {
    const { data } = await weapiRequest<{
      data: { dailySongs: NeteaseTypings.SongsItemSt[] };
    }>("https://music.163.com/api/v3/discovery/recommend/songs", {});
    const ret = data.dailySongs.map(resolveSongItemSt);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function scrobble(
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

export async function userDetail(
  uid: number
): Promise<NeteaseTypings.UserDetail | void> {
  const key = `user_detail${uid}`;
  const value = apiCache.get<NeteaseTypings.UserDetail>(key);
  if (value) return value;
  try {
    const { profile } = await weapiRequest<{
      profile: NeteaseTypings.UserDetail;
    }>(`https://music.163.com/weapi/v1/user/detail/${uid}`, {});
    const ret = resolveUserDetail(profile);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return;
}

export async function userFolloweds(
  userId: number,
  limit: number,
  offset: number
): Promise<NeteaseTypings.UserDetail[]> {
  const key = `user_followeds${userId}-${limit}`;
  const value = apiCache.get<NeteaseTypings.UserDetail[]>(key);
  if (value) return value;
  try {
    const { followeds } = await eapiRequest<{
      followeds: NeteaseTypings.UserDetail[];
    }>(
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

export async function userFollows(
  uid: number,
  limit: number,
  offset: number
): Promise<NeteaseTypings.UserDetail[]> {
  const key = `user_follows${uid}-${limit}-${offset}`;
  const value = apiCache.get<NeteaseTypings.UserDetail[]>(key);
  if (value) return value;
  try {
    const { follow } = await weapiRequest<{
      follow: NeteaseTypings.UserDetail[];
    }>(`https://music.163.com/weapi/user/getfollows/${uid}`, {
      offset,
      limit,
      order: true,
    });
    const ret = follow.map(resolveUserDetail);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

type UserLevel = { progress: number; level: number };

export async function userLevel(): Promise<UserLevel> {
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

export async function userPlaylist(
  uid: number
): Promise<NeteaseTypings.PlaylistItem[]> {
  const key = `user_playlist${uid}`;
  const value = apiCache.get<NeteaseTypings.PlaylistItem[]>(key);
  if (value) return value;
  try {
    const { playlist } = await weapiRequest<{
      playlist: NeteaseTypings.RawPlaylistItem[];
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

export async function userRecord(): Promise<
  Array<NeteaseTypings.RecordData[]>
> {
  const key = `user_record$`;
  const value = apiCache.get<Array<NeteaseTypings.RecordData[]>>(key);
  if (value) return value;
  const tasks: Promise<NeteaseTypings.RecordData[]>[] = [
    (async () => {
      const { weekData } = await weapiRequest<{
        weekData: { playCount: number; song: NeteaseTypings.SongsItem }[];
      }>("https://music.163.com/weapi/v1/play/record", {
        type: 1,
        uid: AccountState.uid,
      });
      return weekData.map(({ playCount, song }) => ({
        ...resolveSongItem(song),
        playCount,
      }));
    })(),
    (async () => {
      const { allData } = await weapiRequest<{
        allData: { playCount: number; song: NeteaseTypings.SongsItem }[];
      }>("https://music.163.com/weapi/v1/play/record", {
        type: 0,
        uid: AccountState.uid,
      });
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
    console.error(err);
  }
  return [[], []];
}

async function yunbeiInfo(): Promise<{
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

async function yunbeiSign(): Promise<void> {
  try {
    await weapiRequest("https://music.163.com/api/point/dailyTask", {
      type: 0,
    });
  } catch (err) {
    console.error(err);
  }
}

async function yunbeiToday(): Promise<boolean> {
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
