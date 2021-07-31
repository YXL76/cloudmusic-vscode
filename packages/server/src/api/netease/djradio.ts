import {
  AccountState,
  resolveProgramDetail,
  resolveRadioDetail,
  resolveUserDetail,
} from "./helper";
import type { NeteaseTypings } from "api";
import { apiCache } from "../../cache";
import { logError } from "../../utils";
import { weapiRequest } from "./request";

/* export async function djCategoryRecommend() {
  const key = "dj_category_recommend";
  const value = apiCache.get<{ name: string; id: number }[]>(key);
  if (value) return value;
  try {
    const { categories } = await weapiRequest<{
      categories: { name: string; id: number }[];
    }>("music.163.com/weapi/djradio/home/category/recommend");
    const ret = categories.map(({ name, id }) => ({ name, id }));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
} */

export async function djCatelist(): Promise<
  readonly { name: string; id: number }[]
> {
  const key = "dj_catelist";
  const value = apiCache.get<readonly { name: string; id: number }[]>(key);
  if (value) return value;
  try {
    const { categories } = await weapiRequest<{
      categories: readonly { name: string; id: number }[];
    }>("music.163.com/weapi/djradio/category/get");
    const ret = categories.map(({ name, id }) => ({ name, id }));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function djDetail(
  id: number
): Promise<NeteaseTypings.RadioDetail | void> {
  const key = `dj_detail${id}`;
  const value = apiCache.get<NeteaseTypings.RadioDetail>(key);
  if (value) return value;
  try {
    const { data } = await weapiRequest<{ data: NeteaseTypings.RadioDetail }>(
      "music.163.com/api/djradio/v2/get",
      { id }
    );
    const ret = resolveRadioDetail(data);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return;
}

export async function djHot(
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = `dj_hot${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  try {
    const { djRadios } = await weapiRequest<{
      djRadios: readonly NeteaseTypings.RadioDetail[];
    }>("music.163.com/weapi/djradio/hot/v1", { limit, offset });
    const ret = djRadios.map(resolveRadioDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function djProgram(
  radioId: number,
  limit: number
): Promise<readonly NeteaseTypings.ProgramDetail[]> {
  const key = `dj_program${radioId}`;
  const value = apiCache.get<readonly NeteaseTypings.ProgramDetail[]>(key);
  if (value) return value;
  try {
    const { programs } = await weapiRequest<{
      programs: readonly NeteaseTypings.RawProgramDetail[];
    }>("music.163.com/weapi/dj/program/byradio", {
      radioId,
      limit,
      offset: 0,
      asc: false,
    });
    const ret = programs.map(resolveProgramDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function djProgramDetail(
  id: number
): Promise<NeteaseTypings.ProgramDetail | void> {
  const key = `dj_program_detail${id}`;
  const value = apiCache.get<NeteaseTypings.ProgramDetail>(key);
  if (value) return value;
  try {
    const { program } = await weapiRequest<{
      program: NeteaseTypings.RawProgramDetail;
    }>("music.163.com/api/dj/program/detail", { id });
    const ret = resolveProgramDetail(program);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return;
}

export async function djProgramToplist(
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.ProgramDetail[]> {
  const key = `dj_program_toplist${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.ProgramDetail[]>(key);
  if (value) return value;
  try {
    const { toplist } = await weapiRequest<{
      toplist: readonly { program: NeteaseTypings.RawProgramDetail }[];
    }>("music.163.com/api/program/toplist/v1", { limit, offset });
    const ret = toplist.map(({ program }) => resolveProgramDetail(program));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function djProgramToplistHours(): Promise<
  readonly NeteaseTypings.ProgramDetail[]
> {
  const key = "dj_program_toplist_hours";
  const value = apiCache.get<readonly NeteaseTypings.ProgramDetail[]>(key);
  if (value) return value;
  try {
    const {
      data: { list },
    } = await weapiRequest<{
      data: { list: readonly { program: NeteaseTypings.RawProgramDetail }[] };
    }>("music.163.com/api/djprogram/toplist/hours", { limit: 100 });
    const ret = list.map(({ program }) => resolveProgramDetail(program));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function djRadioHot(
  cateId: number,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = `dj_radio_hot${cateId}-${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  try {
    const { djRadios } = await weapiRequest<{
      djRadios: readonly NeteaseTypings.RadioDetail[];
    }>("music.163.com/api/djradio/hot", { cateId, limit, offset });
    const ret = djRadios.map(resolveRadioDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function djRecommend(
  uid: number
): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = "dj_recommend";
  const value = apiCache.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  try {
    const { djRadios } = await weapiRequest<{
      djRadios: readonly NeteaseTypings.RadioDetail[];
    }>(
      "music.163.com/weapi/djradio/recommend/v1",
      {},
      AccountState.cookies.get(uid)
    );
    const ret = djRadios.map(resolveRadioDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function djRecommendType(
  uid: number,
  cateId: number
): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = `dj_recommend_type${cateId}`;
  const value = apiCache.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  try {
    const { djRadios } = await weapiRequest<{
      djRadios: readonly NeteaseTypings.RadioDetail[];
    }>(
      "music.163.com/weapi/djradio/recommend",
      { cateId },
      AccountState.cookies.get(uid)
    );
    const ret = djRadios.map(resolveRadioDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function programRecommend(
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.ProgramDetail[]> {
  const key = `program_recommend${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.ProgramDetail[]>(key);
  if (value) return value;
  try {
    const { programs } = await weapiRequest<{
      programs: readonly NeteaseTypings.RawProgramDetail[];
    }>("music.163.com/weapi/program/recommend/v1", { limit, offset });
    const ret = programs.map(resolveProgramDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

export async function djSub(id: number, t: "sub" | "unsub"): Promise<boolean> {
  try {
    await weapiRequest<{
      djRadios: readonly NeteaseTypings.RadioDetail[];
    }>(`music.163.com/weapi/djradio/${t}`, { id });
    return true;
  } catch (err) {
    logError(err);
  }
  return false;
}

export async function djSublist(
  uid: number
): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = `dj_sublist${uid}`;
  const value = apiCache.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  try {
    const { djRadios } = await weapiRequest<{
      djRadios: readonly NeteaseTypings.RadioDetail[];
    }>(
      "music.163.com/weapi/djradio/get/subed",
      {
        limit: 30,
        offset: 0,
        total: true,
      },
      AccountState.cookies.get(uid)
    );
    const ret = djRadios.map(resolveRadioDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

/* export async function djSubscriber(
  id: number,
  limit: number,
  lasttime = -1
) {
  type Ret = {
    subscribers: NeteaseTypings.UserDetail[];
    time: number;
    hasMore: boolean;
  };
  const key = `dj_subscriber${id}-${limit}-${lasttime}`;
  const value = apiCache.get<Ret>(key);
  if (value) return value;
  try {
    const { subscribers, time, hasMore } = await weapiRequest<Ret>(
      "music.163.com/api/djradio/subscriber",
      { time: lasttime, id, limit, total: "true" }
    );
    const ret = {
      subscribers: subscribers.map(solveUserDetail),
      time,
      hasMore,
    };
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return { subscribers: [], time: -1, hasMore: false };
} */

export async function djSubscriber(
  id: number,
  limit: number
): Promise<readonly NeteaseTypings.UserDetail[]> {
  const key = `dj_subscriber${id}-${limit}`;
  const value = apiCache.get<readonly NeteaseTypings.UserDetail[]>(key);
  if (value) return value;
  try {
    const { subscribers } = await weapiRequest<{
      subscribers: readonly NeteaseTypings.UserDetail[];
    }>("music.163.com/api/djradio/subscriber", {
      time: -1,
      id,
      limit,
      total: "true",
    });
    const ret = subscribers.map(resolveUserDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}

// 0: 新晋, 1: 热门
export async function djToplist(
  type: 0 | 1,
  limit: number,
  offset: number
): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = `dj_toplist${type}-${limit}-${offset}`;
  const value = apiCache.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  try {
    const { toplist } = await weapiRequest<{
      toplist: readonly NeteaseTypings.RadioDetail[];
    }>("music.163.com/api/djradio/toplist", { type, limit, offset });
    const ret = toplist.map(resolveRadioDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
}
