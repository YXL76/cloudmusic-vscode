import { ACCOUNT_STATE, broadcastProfiles, jsonToCookie } from "./helper.js";
import { Cookie, CookieJar, cookieCompare } from "tough-cookie";
import { eapi, weapi } from "./crypto.js";
import { API_CONFIG } from "../helper.js";
import type { Headers } from "got";
import type { NeteaseTypings } from "api";
import { STATE } from "../../state.js";
import { got } from "got";
import { logError } from "../../utils.js";
import { loginStatus } from "./account.js";

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
      return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.2535.67";
    case "darwin":
      return "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15";
    default:
      return "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
  }
})();

// const anonymousToken =
//   "8aae43f148f990410b9a2af38324af24e87ab9227c9265627ddd10145db744295fcd8701dc45b1ab8985e142f491516295dd965bae848761274a577a62b0fdc54a50284d1e434dcc04ca6d1a52333c9a";
const csrfTokenReg = RegExp(/_csrf=([^(;|$)]+)/);

type QueryInput = Record<string, string | number | boolean>;

export const generateHeader = (cookie: NeteaseTypings.Cookie | Cookie[]) => {
  const header: Record<string, string> = {
    /* eslint-disable @typescript-eslint/naming-convention */
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": userAgent,
    ...(STATE.foreign ? { "X-Real-IP": "118.88.88.88", "X-Forwarded-For": "118.88.88.88" } : {}),
    Referer: "music.163.com",
    /* eslint-enable @typescript-eslint/naming-convention */
  };
  if (Array.isArray(cookie)) {
    const os = cookie.find((c) => c.key === "os")?.value;
    if (!os) cookie.push(new Cookie({ key: "os", value: "ios" }));
    const appver = cookie.find((c) => c.key === "appver")?.value;
    if (!appver) cookie.push(new Cookie({ key: "appver", value: "9.0.95" }));
    header["Cookie"] = cookie
      .sort(cookieCompare)
      .map((c) => c.cookieString())
      .join("; ");
    header["os"] = os ?? "ios";
    header["appver"] = appver ?? "9.0.95";
  } else {
    cookie.os ??= "ios";
    cookie.appver ??= "9.0.95";
    header["Cookie"] = jsonToCookie(cookie);
    header["os"] = cookie.os;
    header["appver"] = cookie.appver;
  }

  return header;
};

const responseHandler = async <T>(
  url: string,
  headers: Headers,
  data: QueryInput,
): Promise<(T & { readonly cookie?: string[] }) | void> => {
  const res = await client<{ readonly code?: number; cookie?: string[] } & T>(url, { form: data, headers });
  if (!res) return;
  const status = res.body.code || res.statusCode;
  if (status !== 200 && status !== 512) return logError(res.body);

  if (res.headers["set-cookie"]?.length) res.body.cookie = res.headers["set-cookie"];
  return res.body;
};

export const loginRequest = async (url: string, data: QueryInput): Promise<NeteaseTypings.Profile | void> => {
  url = `${API_CONFIG.protocol}://${url}`;
  const headers = generateHeader({ os: "ios", appver: "9.0.95" });
  const res = await client<{ readonly code?: number; profile?: NeteaseTypings.Profile }>(url, {
    form: weapi(data),
    headers,
  });

  if (!res) return;
  const status = res.body.code || res.statusCode;
  if (status !== 200) return logError(res.body);

  const profile = res.body.profile;
  if (!profile || !("userId" in profile) || !("nickname" in profile)) return;

  if (!res.headers["set-cookie"]?.length) return;
  const cookie = new CookieJar();
  for (const c of res.headers["set-cookie"]) cookie.setCookieSync(c, url);
  ACCOUNT_STATE.setStaticCookie(cookie);
  ACCOUNT_STATE.cookies.set(profile.userId, cookie);
  ACCOUNT_STATE.profile.set(profile.userId, profile);
  broadcastProfiles();
  return profile;
};

type QRCheckRes =
  | { readonly code: number; readonly message: string }
  | { readonly code: 802; readonly message: string; readonly nickname: string; readonly avatarUrl: string };
export const qrloginRequest = async (url: string, data: QueryInput): Promise<QRCheckRes> => {
  url = `${API_CONFIG.protocol}://${url}`;
  const headers = generateHeader({});
  const res = await client<{ readonly code: number; readonly message: string }>(url, { form: weapi(data), headers });
  if (!res) throw Error("QR Code login error!");
  const status = res.body.code || res.statusCode;
  if (status === 800 || status === 801 || status === 802) return res.body;
  if (status !== 803) throw Error(<string>(<unknown>res.body));

  if (res.headers["set-cookie"]?.length) {
    const cookie = new CookieJar();
    for (const c of res.headers["set-cookie"]) cookie.setCookieSync(c, url);
    await loginStatus(JSON.stringify(cookie.serializeSync()));
    broadcastProfiles();
  }
  return res.body;
};

export const weapiRequest = <T = QueryInput>(
  url: string,
  data: QueryInput = {},
  cookie = ACCOUNT_STATE.defaultCookie,
): Promise<(T & { readonly cookie?: string[] }) | void> => {
  url = `${API_CONFIG.protocol}://${url}`;
  // if (!cookie.MUSIC_U) cookie.MUSIC_A = anonymousToken;
  const headers = generateHeader(cookie.getCookiesSync(url));
  const csrfToken = csrfTokenReg.exec(headers["Cookie"]);
  data.csrf_token = csrfToken?.[1] ?? "";
  return responseHandler<T>(url, headers, weapi(data));
};

export const eapiRequest = async <T = QueryInput>(
  url: string,
  data: NodeJS.Dict<string | number | boolean | Headers>,
  encryptUrl: string,
  cookie = ACCOUNT_STATE.defaultCookie,
): Promise<(T & { readonly cookie?: string[] }) | void> => {
  url = `${API_CONFIG.protocol}://${url}`;
  const cookieJSON: Record<string, string | null | undefined> = {};
  for (const c of cookie.getCookiesSync(url)) {
    const { key, value } = <{ key: string; value?: string | null }>c.toJSON();
    cookieJSON[key] = value;
  }

  const now = Date.now();
  const header: Headers = {
    osver: cookieJSON["osver"] || "17.4.1",
    deviceId: cookieJSON["deviceId"] || "",
    appver: cookieJSON["appver"] || "9.0.95",
    versioncode: cookieJSON["versioncode"] || "140",
    mobilename: cookieJSON["mobilename"] || "",
    buildver: cookieJSON["buildver"] || now.toString().slice(0, 10),
    resolution: cookieJSON["resolution"] || "1920x1080",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __csrf: cookieJSON["__csrf"] || "",
    os: cookieJSON["os"] || <const>"ios",
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
  const headers = generateHeader(header);
  data.header = header;
  return responseHandler<T>(url, headers, eapi(encryptUrl, data));
};

export const apiRequest = async <T = QueryInput>(
  url: string,
  data: QueryInput = {},
  cookie = ACCOUNT_STATE.defaultCookie,
): Promise<(T & { readonly cookie?: string[] }) | void> => {
  url = `${API_CONFIG.protocol}://${url}`;
  // if (!cookie.MUSIC_U) cookie.MUSIC_A = anonymousToken;
  const headers = generateHeader(cookie.getCookiesSync(url));
  return responseHandler<T>(url, headers, data);
};
