import { AccountState, broadcastProfiles, jsonToCookie } from "./helper";
import { eapi, weapi } from "./crypto";
import { APISetting } from "../index";
import { CookieJar } from "tough-cookie";
import type { Headers } from "got";
import type { NeteaseTypings } from "api";
import { STATE } from "../../state";
import { got } from "got";
import { logError } from "../../utils";
import { loginStatus } from "./index";

const client = got.extend({
  method: "POST",
  http2: true,
  responseType: "json",
  timeout: { response: 8000 },
  retry: {
    methods: ["GET", "POST", "PUT", "HEAD", "DELETE", "OPTIONS", "TRACE"],
  },
});

const userAgent = (() => {
  switch (process.platform) {
    case "win32":
      return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36";
    case "darwin":
      return "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15";
    default:
      return "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36";
  }
})();

// const anonymousToken =
//   "8aae43f148f990410b9a2af38324af24e87ab9227c9265627ddd10145db744295fcd8701dc45b1ab8985e142f491516295dd965bae848761274a577a62b0fdc54a50284d1e434dcc04ca6d1a52333c9a";
const csrfTokenReg = RegExp(/_csrf=([^(;|$)]+)/);

type QueryInput = Record<string, string | number | boolean>;

/* type Headers = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Cookie: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Referer?: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "Content-Type": string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "User-Agent": string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "X-Real-IP"?: string;
}; */

export const generateHeader = () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Cookie: "",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "Content-Type": "application/x-www-form-urlencoded",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "User-Agent": userAgent,
  ...(STATE.foreign
    ? // eslint-disable-next-line @typescript-eslint/naming-convention
      { "X-Real-IP": "118.88.88.88", "X-Forwarded-For": "118.88.88.88" }
    : {}),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Referer: "music.163.com",
  /* ...(url.includes("music.163.com/")
    ? // eslint-disable-next-line @typescript-eslint/naming-convention
      { Referer: "music.163.com" }
    : {}), */
});

const responseHandler = async <T>(
  url: string,
  headers: Headers,
  data: QueryInput
): Promise<(T & { readonly cookie?: string[] }) | void> => {
  const res = await client<{ readonly code?: number; cookie?: string[] } & T>(
    url,
    { form: data, headers }
  );
  if (!res) return;
  const status = res.body.code || res.statusCode;
  if (status !== 200 && status !== 512) return logError(res.body);

  if (res.headers["set-cookie"]?.length) {
    res.body.cookie = res.headers["set-cookie"];
  }
  return res.body;
};

export const loginRequest = async (
  url: string,
  data: QueryInput
): Promise<NeteaseTypings.Profile | void> => {
  url = `${APISetting.apiProtocol}://${url}`;
  const headers = generateHeader();
  headers["Cookie"] = jsonToCookie({ os: "pc", appver: "2.9.7" });
  const res = await client<{
    readonly code?: number;
    profile?: NeteaseTypings.Profile;
  }>(url, { form: weapi(data), headers });

  if (!res) return;
  const status = res.body.code || res.statusCode;
  if (status !== 200) return logError(res.body);

  const profile = res.body.profile;
  if (!profile || !("userId" in profile) || !("nickname" in profile)) return;

  if (!res.headers["set-cookie"]?.length) return;
  const cookie = new CookieJar();
  for (const c of res.headers["set-cookie"]) cookie.setCookieSync(c, url);
  AccountState.setStaticCookie(cookie);
  AccountState.cookies.set(profile.userId, cookie);
  AccountState.profile.set(profile.userId, profile);
  broadcastProfiles();
  return profile;
};

export const qrloginRequest = async (
  url: string,
  data: QueryInput
): Promise<number | void> => {
  url = `${APISetting.apiProtocol}://${url}`;
  const headers = generateHeader();
  const res = await client<{ readonly code?: number }>(url, {
    form: weapi(data),
    headers,
  });
  if (!res) return;
  const status = res.body.code || res.statusCode;
  if (status === 801 || status === 802) return;
  if (status !== 803) throw Error(res.body as string);

  if (!res.headers["set-cookie"]?.length) return;
  const cookie = new CookieJar();
  for (const c of res.headers["set-cookie"]) cookie.setCookieSync(c, url);
  await loginStatus(JSON.stringify(cookie.serializeSync()));
  broadcastProfiles();
  return status;
};

export const weapiRequest = <T = QueryInput>(
  url: string,
  data: QueryInput = {},
  cookie = AccountState.defaultCookie
): Promise<(T & { readonly cookie?: string[] }) | void> => {
  url = `${APISetting.apiProtocol}://${url}`;
  // if (!cookie.MUSIC_U) cookie.MUSIC_A = anonymousToken;
  const headers = generateHeader();
  headers["Cookie"] = cookie.getCookieStringSync(url);
  const csrfToken = csrfTokenReg.exec(headers["Cookie"]);
  data.csrf_token = csrfToken?.[1] ?? "";
  return responseHandler<T>(url, headers, weapi(data));
};

export const eapiRequest = async <T = QueryInput>(
  url: string,
  data: NodeJS.Dict<string | number | boolean | Headers>,
  encryptUrl: string,
  cookie = AccountState.defaultCookie
): Promise<(T & { readonly cookie?: string[] }) | void> => {
  url = `${APISetting.apiProtocol}://${url}`;
  const cookieJSON: Record<string, string | null | undefined> = {};
  for (const c of cookie.getCookiesSync(url)) {
    const { key, value } = c.toJSON() as { key: string; value?: string | null };
    cookieJSON[key] = value;
  }

  const now = Date.now();
  const header: Headers = {
    osver: cookieJSON["osver"] || "",
    deviceId: cookieJSON["deviceId"] || "",
    appver: cookieJSON["appver"] || "8.7.01",
    versioncode: cookieJSON["versioncode"] || "140",
    mobilename: cookieJSON["mobilename"] || "",
    buildver: cookieJSON["buildver"] || now.toString().slice(0, 10),
    resolution: cookieJSON["resolution"] || "1920x1080",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __csrf: cookieJSON["__csrf"] || "",
    os: cookieJSON["os"] || ("android" as const),
    channel: cookieJSON["channel"] || "",
    requestId: `${now}_${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(4, "0")}`,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    MUSIC_U: cookieJSON["MUSIC_U"] || "",
  };
  // if (cookie.MUSIC_U) header["MUSIC_U"] = cookie.MUSIC_U;
  // else {
  //   cookie.MUSIC_A = anonymousToken;
  //   header["MUSIC_A"] = anonymousToken;
  // }
  const headers = generateHeader();
  headers["Cookie"] = jsonToCookie(header);
  data.header = header;
  return responseHandler<T>(url, headers, eapi(encryptUrl, data));
};

export const apiRequest = async <T = QueryInput>(
  url: string,
  data: QueryInput = {},
  cookie = AccountState.defaultCookie
): Promise<(T & { readonly cookie?: string[] }) | void> => {
  url = `${APISetting.apiProtocol}://${url}`;
  // if (!cookie.MUSIC_U) cookie.MUSIC_A = anonymousToken;
  const headers = generateHeader();
  headers["Cookie"] = cookie.getCookieStringSync(url);
  return responseHandler<T>(url, headers, data);
};
