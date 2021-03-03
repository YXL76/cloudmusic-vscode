import type {
  ProgramDetail,
  RadioDetail,
  RawProgramDetail,
  UserDetail,
} from "../constant";
import { resolveProgramDetail, resolveRadioDetail, weapiRequest } from ".";
import { apiCache } from "../util";
import { resolveUserDetail } from "./helper";

/* export async function apiDjCategoryRecommend() {
  const key = "dj_category_recommend";
  const value = apiCache.get<{ name: string; id: number }[]>(key);
  if (value) return value;
  try {
    const { categories } = await weapiRequest<{
      categories: { name: string; id: number }[];
    }>("https://music.163.com/weapi/djradio/home/category/recommend", {});
    const ret = categories.map(({ name, id }) => ({ name, id }));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
} */

export async function apiDjCatelist(): Promise<{ name: string; id: number }[]> {
  const key = "dj_catelist";
  const value = apiCache.get<{ name: string; id: number }[]>(key);
  if (value) return value;
  try {
    const { categories } = await weapiRequest<{
      categories: { name: string; id: number }[];
    }>("https://music.163.com/weapi/djradio/category/get", {});
    const ret = categories.map(({ name, id }) => ({ name, id }));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiDjDetail(id: number): Promise<RadioDetail | void> {
  const key = `dj_detail${id}`;
  const value = apiCache.get<RadioDetail>(key);
  if (value) return value;
  try {
    const { data } = await weapiRequest<{ data: RadioDetail }>(
      "https://music.163.com/api/djradio/v2/get",
      { id }
    );
    const ret = resolveRadioDetail(data);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return;
}

export async function apiDjHot(
  limit: number,
  offset: number
): Promise<RadioDetail[]> {
  const key = `dj_hot${limit}-${offset}`;
  const value = apiCache.get<RadioDetail[]>(key);
  if (value) return value;
  try {
    const { djRadios } = await weapiRequest<{ djRadios: RadioDetail[] }>(
      "https://music.163.com/weapi/djradio/hot/v1",
      { limit, offset }
    );
    const ret = djRadios.map(resolveRadioDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiDjProgram(
  radioId: number,
  limit: number
): Promise<ProgramDetail[]> {
  const key = `dj_program${radioId}`;
  const value = apiCache.get<ProgramDetail[]>(key);
  if (value) return value;
  try {
    const { programs } = await weapiRequest<{ programs: RawProgramDetail[] }>(
      "https://music.163.com/weapi/dj/program/byradio",
      { radioId, limit, offset: 0, asc: false }
    );
    const ret = programs.map(resolveProgramDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiDjProgramDetail(
  id: number
): Promise<ProgramDetail | void> {
  const key = `dj_program_detail${id}`;
  const value = apiCache.get<ProgramDetail>(key);
  if (value) return value;
  try {
    const { program } = await weapiRequest<{ program: RawProgramDetail }>(
      "https://music.163.com/api/dj/program/detail",
      { id }
    );
    const ret = resolveProgramDetail(program);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return;
}

export async function apiDjProgramToplist(
  limit: number,
  offset: number
): Promise<ProgramDetail[]> {
  const key = `dj_program_toplist${limit}-${offset}`;
  const value = apiCache.get<ProgramDetail[]>(key);
  if (value) return value;
  try {
    const { toplist } = await weapiRequest<{
      toplist: { program: RawProgramDetail }[];
    }>("https://music.163.com/api/program/toplist/v1", { limit, offset });
    const ret = toplist.map(({ program }) => resolveProgramDetail(program));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiDjProgramToplistHours(): Promise<ProgramDetail[]> {
  const key = "dj_program_toplist_hours";
  const value = apiCache.get<ProgramDetail[]>(key);
  if (value) return value;
  try {
    const {
      data: { list },
    } = await weapiRequest<{ data: { list: { program: RawProgramDetail }[] } }>(
      "https://music.163.com/api/djprogram/toplist/hours",
      { limit: 100 }
    );
    const ret = list.map(({ program }) => resolveProgramDetail(program));
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiDjRadioHot(
  cateId: number,
  limit: number,
  offset: number
): Promise<RadioDetail[]> {
  const key = `dj_radio_hot${cateId}-${limit}-${offset}`;
  const value = apiCache.get<RadioDetail[]>(key);
  if (value) return value;
  try {
    const { djRadios } = await weapiRequest<{ djRadios: RadioDetail[] }>(
      "https://music.163.com/api/djradio/hot",
      { cateId, limit, offset }
    );
    const ret = djRadios.map(resolveRadioDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiDjRecommend(): Promise<RadioDetail[]> {
  const key = "dj_recommend";
  const value = apiCache.get<RadioDetail[]>(key);
  if (value) return value;
  try {
    const { djRadios } = await weapiRequest<{ djRadios: RadioDetail[] }>(
      "https://music.163.com/weapi/djradio/recommend/v1",
      {}
    );
    const ret = djRadios.map(resolveRadioDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiDjRecommendType(
  cateId: number
): Promise<RadioDetail[]> {
  const key = `dj_recommend_type${cateId}`;
  const value = apiCache.get<RadioDetail[]>(key);
  if (value) return value;
  try {
    const { djRadios } = await weapiRequest<{ djRadios: RadioDetail[] }>(
      "https://music.163.com/weapi/djradio/recommend",
      { cateId }
    );
    const ret = djRadios.map(resolveRadioDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiProgramRecommend(
  limit: number,
  offset: number
): Promise<ProgramDetail[]> {
  const key = `program_recommend${limit}-${offset}`;
  const value = apiCache.get<ProgramDetail[]>(key);
  if (value) return value;
  try {
    const { programs } = await weapiRequest<{
      programs: RawProgramDetail[];
    }>("https://music.163.com/weapi/program/recommend/v1", { limit, offset });
    const ret = programs.map(resolveProgramDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

export async function apiDjSub(
  id: number,
  t: "sub" | "unsub"
): Promise<boolean> {
  try {
    await weapiRequest<{
      djRadios: RadioDetail[];
    }>(`https://music.163.com/weapi/djradio/${t}`, { id });
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function apiDjSublist(): Promise<RadioDetail[]> {
  const key = "dj_sublist";
  const value = apiCache.get<RadioDetail[]>(key);
  if (value) return value;
  try {
    const { djRadios } = await weapiRequest<{
      djRadios: RadioDetail[];
    }>("https://music.163.com/weapi/djradio/get/subed", {
      limit: 30,
      offset: 0,
      total: true,
    });
    const ret = djRadios.map(resolveRadioDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

/* export async function apiDjSubscriber(
  id: number,
  limit: number,
  lasttime = -1
) {
  type Ret = {
    subscribers: UserDetail[];
    time: number;
    hasMore: boolean;
  };
  const key = `dj_subscriber${id}-${limit}-${lasttime}`;
  const value = apiCache.get<Ret>(key);
  if (value) return value;
  try {
    const { subscribers, time, hasMore } = await weapiRequest<Ret>(
      "https://music.163.com/api/djradio/subscriber",
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
    console.error(err);
  }
  return { subscribers: [], time: -1, hasMore: false };
} */

export async function apiDjSubscriber(
  id: number,
  limit: number
): Promise<UserDetail[]> {
  const key = `dj_subscriber${id}-${limit}`;
  const value = apiCache.get<UserDetail[]>(key);
  if (value) return value;
  try {
    const { subscribers } = await weapiRequest<{ subscribers: UserDetail[] }>(
      "https://music.163.com/api/djradio/subscriber",
      { time: -1, id, limit, total: "true" }
    );
    const ret = subscribers.map(resolveUserDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}

// 0: 新晋, 1: 热门
export async function apiDjToplist(
  type: 0 | 1,
  limit: number,
  offset: number
): Promise<RadioDetail[]> {
  const key = `dj_toplist${type}-${limit}-${offset}`;
  const value = apiCache.get<RadioDetail[]>(key);
  if (value) return value;
  try {
    const { toplist } = await weapiRequest<{
      toplist: RadioDetail[];
    }>("https://music.163.com/api/djradio/toplist", { type, limit, offset });
    const ret = toplist.map(resolveRadioDetail);
    apiCache.set(key, ret);
    return ret;
  } catch (err) {
    console.error(err);
  }
  return [];
}
