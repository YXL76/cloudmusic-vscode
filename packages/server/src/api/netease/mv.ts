import { API_CACHE } from "../../cache.js";
import type { NeteaseTypings } from "api";
import { resolveMvDetail } from "./helper.js";
import { weapiRequest } from "./request.js";

export async function mvDetail(id: number) {
  const key = `mv_detail${id}`;
  const value = API_CACHE.get<NeteaseTypings.MvDetail>(key);
  if (value) return value;

  const res = await weapiRequest<{ data: NeteaseTypings.MvDetail }>("music.163.com/weapi/v1/mv/detail", { id });
  if (!res || !res.data.brs.length) return;
  const ret = resolveMvDetail(res.data);
  API_CACHE.set(key, ret);
  return ret;
}

export async function mvUrl(id: number, r = 1080) {
  const res = await weapiRequest<{ data: { url: string; r: number; size: number; md5: string } }>(
    "music.163.com/weapi/song/enhance/play/mv/url",
    { id, r },
  );
  if (!res) return;
  return res.data.url;
}
