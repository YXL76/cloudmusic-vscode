import { ACCOUNT_STATE, resolveProgramDetail, resolveRadioDetail, resolveUserDetail } from "./helper.js";
import { API_CACHE } from "../../cache.js";
import type { NeteaseTypings } from "api";
import { weapiRequest } from "./request.js";

/* export async function djCategoryRecommend() {
  const key = "dj_category_recommend";
  const value = API_CACHE.get<{ name: string; id: number }[]>(key);
  if (value) return value;
  try {
    const { categories } = await weapiRequest<{
      categories: { name: string; id: number }[];
    }>("music.163.com/weapi/djradio/home/category/recommend");
    const ret = categories.map(({ name, id }) => ({ name, id }));
    API_CACHE.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return [];
} */

export async function djCatelist(): Promise<readonly { name: string; id: number }[]> {
  const key = "dj_catelist";
  const value = API_CACHE.get<readonly { name: string; id: number }[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    categories: readonly { name: string; id: number }[];
  }>("music.163.com/weapi/djradio/category/get");
  if (!res) return [];
  const ret = res.categories.map(({ name, id }) => ({ name, id }));
  API_CACHE.set(key, ret);
  return ret;
}

export async function djDetail(id: number): Promise<NeteaseTypings.RadioDetail | void> {
  const key = `dj_detail${id}`;
  const value = API_CACHE.get<NeteaseTypings.RadioDetail>(key);
  if (value) return value;
  const res = await weapiRequest<{ data: NeteaseTypings.RadioDetail }>("music.163.com/weapi/djradio/v2/get", { id });
  if (!res) return;
  const ret = resolveRadioDetail(res.data);
  API_CACHE.set(key, ret);
  return ret;
}

export async function djHot(limit: number, offset: number): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = `dj_hot${limit}-${offset}`;
  const value = API_CACHE.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    djRadios: readonly NeteaseTypings.RadioDetail[];
  }>("music.163.com/weapi/djradio/hot/v1", { limit, offset });
  if (!res) return [];
  const ret = res.djRadios.map(resolveRadioDetail);
  API_CACHE.set(key, ret);
  return ret;
}

export async function djProgram(
  uid: number,
  radioId: number,
  limit: number,
): Promise<readonly NeteaseTypings.ProgramDetail[]> {
  const key = `dj_program${radioId}`;
  const value = API_CACHE.get<readonly NeteaseTypings.ProgramDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    programs: readonly NeteaseTypings.RawProgramDetail[];
  }>(
    "music.163.com/weapi/dj/program/byradio",
    { radioId, limit, offset: 0, asc: false },
    ACCOUNT_STATE.cookies.get(uid),
  );
  if (!res) return [];
  const ret = res.programs.map(resolveProgramDetail);
  API_CACHE.set(key, ret);
  return ret;
}

export async function djProgramDetail(id: number): Promise<NeteaseTypings.ProgramDetail | void> {
  const key = `dj_program_detail${id}`;
  const value = API_CACHE.get<NeteaseTypings.ProgramDetail>(key);
  if (value) return value;

  const res = await weapiRequest<{
    program: NeteaseTypings.RawProgramDetail;
  }>("music.163.com/weapi/dj/program/detail", { id });
  if (!res) return;
  const ret = resolveProgramDetail(res.program);
  API_CACHE.set(key, ret);
  return ret;
}

export async function djProgramToplist(
  limit: number,
  offset: number,
): Promise<readonly NeteaseTypings.ProgramDetail[]> {
  const key = `dj_program_toplist${limit}-${offset}`;
  const value = API_CACHE.get<readonly NeteaseTypings.ProgramDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    toplist: readonly { program: NeteaseTypings.RawProgramDetail }[];
  }>("music.163.com/weapi/program/toplist/v1", { limit, offset });
  if (!res) return [];
  const ret = res.toplist.map(({ program }) => resolveProgramDetail(program));
  API_CACHE.set(key, ret);
  return ret;
}

export async function djProgramToplistHours(): Promise<readonly NeteaseTypings.ProgramDetail[]> {
  const key = "dj_program_toplist_hours";
  const value = API_CACHE.get<readonly NeteaseTypings.ProgramDetail[]>(key);
  if (value) return value;

  const res = await weapiRequest<{
    data: { list: readonly { program: NeteaseTypings.RawProgramDetail }[] };
  }>("music.163.com/weapi/djprogram/toplist/hours", { limit: 100 });
  if (!res) return [];
  const ret = res.data.list.map(({ program }) => resolveProgramDetail(program));
  API_CACHE.set(key, ret);
  return ret;
}

export async function djRadioHot(
  cateId: number,
  limit: number,
  offset: number,
): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = `dj_radio_hot${cateId}-${limit}-${offset}`;
  const value = API_CACHE.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    djRadios: readonly NeteaseTypings.RadioDetail[];
  }>("music.163.com/weapi/djradio/hot", { cateId, limit, offset });
  if (!res) return [];
  const ret = res.djRadios.map(resolveRadioDetail);
  API_CACHE.set(key, ret);
  return ret;
}

export async function djRecommend(uid: number): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = "dj_recommend";
  const value = API_CACHE.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    djRadios: readonly NeteaseTypings.RadioDetail[];
  }>("music.163.com/weapi/djradio/recommend/v1", {}, ACCOUNT_STATE.cookies.get(uid));
  if (!res) return [];
  const ret = res.djRadios.map(resolveRadioDetail);
  API_CACHE.set(key, ret);
  return ret;
}

export async function djRecommendType(uid: number, cateId: number): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = `dj_recommend_type${cateId}`;
  const value = API_CACHE.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    djRadios: readonly NeteaseTypings.RadioDetail[];
  }>("music.163.com/weapi/djradio/recommend", { cateId }, ACCOUNT_STATE.cookies.get(uid));
  if (!res) return [];
  const ret = res.djRadios.map(resolveRadioDetail);
  API_CACHE.set(key, ret);
  return ret;
}

export async function programRecommend(
  limit: number,
  offset: number,
): Promise<readonly NeteaseTypings.ProgramDetail[]> {
  const key = `program_recommend${limit}-${offset}`;
  const value = API_CACHE.get<readonly NeteaseTypings.ProgramDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    programs: readonly NeteaseTypings.RawProgramDetail[];
  }>("music.163.com/weapi/program/recommend/v1", { limit, offset });
  if (!res) return [];
  const ret = res.programs.map(resolveProgramDetail);
  API_CACHE.set(key, ret);
  return ret;
}

export async function djSub(id: number, t: "sub" | "unsub"): Promise<boolean> {
  return !!(await weapiRequest<{
    djRadios: readonly NeteaseTypings.RadioDetail[];
  }>(`music.163.com/weapi/djradio/${t}`, { id }));
}

export async function djSublist(uid: number): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = `dj_sublist${uid}`;
  const value = API_CACHE.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    djRadios: readonly NeteaseTypings.RadioDetail[];
  }>("music.163.com/weapi/djradio/get/subed", { limit: 30, offset: 0, total: true }, ACCOUNT_STATE.cookies.get(uid));
  if (!res) return [];
  const ret = res.djRadios.map(resolveRadioDetail);
  API_CACHE.set(key, ret);
  return ret;
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
  const value = API_CACHE.get<Ret>(key);
  if (value) return value;
  try {
    const { subscribers, time, hasMore } = await weapiRequest<Ret>(
      "music.163.com/weapi/djradio/subscriber",
      { time: lasttime, id, limit, total: "true" }
    );
    const ret = {
      subscribers: subscribers.map(solveUserDetail),
      time,
      hasMore,
    };
    API_CACHE.set(key, ret);
    return ret;
  } catch (err) {
    logError(err);
  }
  return { subscribers: [], time: -1, hasMore: false };
} */

export async function djSubscriber(id: number, limit: number): Promise<readonly NeteaseTypings.UserDetail[]> {
  const key = `dj_subscriber${id}-${limit}`;
  const value = API_CACHE.get<readonly NeteaseTypings.UserDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    subscribers: readonly NeteaseTypings.UserDetail[];
  }>("music.163.com/weapi/djradio/subscriber", { time: -1, id, limit, total: true });
  if (!res) return [];
  const ret = res.subscribers.map(resolveUserDetail);
  API_CACHE.set(key, ret);
  return ret;
}

// 0: 新晋, 1: 热门
export async function djToplist(
  type: 0 | 1,
  limit: number,
  offset: number,
): Promise<readonly NeteaseTypings.RadioDetail[]> {
  const key = `dj_toplist${type}-${limit}-${offset}`;
  const value = API_CACHE.get<readonly NeteaseTypings.RadioDetail[]>(key);
  if (value) return value;
  const res = await weapiRequest<{
    toplist: readonly NeteaseTypings.RadioDetail[];
  }>("music.163.com/weapi/djradio/toplist", { type, limit, offset });
  if (!res) return [];
  const ret = res.toplist.map(resolveRadioDetail);
  API_CACHE.set(key, ret);
  return ret;
}
