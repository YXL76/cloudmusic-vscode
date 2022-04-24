import {
  AccountState,
  broadcastProfiles,
  cookieToJson,
  jsonToCookie,
} from "./helper";
import { eapi, weapi } from "./crypto";
import { APISetting } from "..";
import type { AxiosResponse } from "axios";
import type { NeteaseTypings } from "api";
import { State } from "../../state";
import { URLSearchParams } from "url";
import axios from "axios";
import { logError } from "../../utils";
import { loginStatus } from ".";
import { randomBytes } from "crypto";

const userAgent = (() => {
  switch (process.platform) {
    case "win32":
      return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36";
    case "darwin":
      return "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Safari/605.1.15";
    default:
      return "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36";
  }
})();

const csrfTokenReg = RegExp(/_csrf=([^(;|$)]+)/);

type QueryInput = Record<string, string>;

type Headers = {
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
};

export const generateHeader = (url: string): Headers => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Cookie: "",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "Content-Type": "application/x-www-form-urlencoded",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "User-Agent": userAgent,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ...(State.foreign ? { "X-Real-IP": "118.88.88.88" } : {}),
  ...(url.startsWith("music.163.com/")
    ? // eslint-disable-next-line @typescript-eslint/naming-convention
      { Referer: "music.163.com" }
    : {}),
});

const spStatus = new Set([200, 800, 803]);

const responseHandler = async <T>(
  url: string,
  headers: Headers,
  data: QueryInput,
  eapi?: boolean
): Promise<T | void> => {
  const res = await axios
    .post<string, AxiosResponse<{ readonly code?: number } & T>>(
      url,
      new URLSearchParams(data).toString(),
      {
        proxy: false,
        headers,
        ...(eapi ? { encoding: null } : {}),
      }
    )
    .catch(logError);
  if (!res) return;
  const status = res.data.code || res.status;
  if (!spStatus.has(status)) return;
  return res.data;
};

export const loginRequest = async (
  url: string,
  data: QueryInput
): Promise<NeteaseTypings.Profile | void> => {
  url = `${APISetting.apiProtocol}://${url}`;
  const headers = generateHeader(url);
  headers["Cookie"] = jsonToCookie({ os: "pc", appver: "2.9.7" });
  const res = await axios
    .post<
      string,
      AxiosResponse<{
        readonly code?: number;
        profile?: NeteaseTypings.Profile;
      }>
    >(url, new URLSearchParams(weapi(data)).toString(), {
      proxy: false,
      headers,
    })
    .catch(logError);

  if (!res) return;
  const status = res.data.code || res.status;
  if (!spStatus.has(status)) return logError(res.data);
  const profile = res.data.profile;
  if (!profile || !("userId" in profile) || !("nickname" in profile)) return;
  if ("set-cookie" in res.headers) {
    const cookie = cookieToJson(
      res.headers["set-cookie"] as unknown as string[]
    );
    AccountState.cookies.set(profile.userId, cookie);
    AccountState.profile.set(profile.userId, profile);
    broadcastProfiles();
  }
  return profile;
};

export const qrloginRequest = async (
  url: string,
  data: QueryInput
): Promise<number | void> => {
  url = `${APISetting.apiProtocol}://${url}`;
  const headers = generateHeader(url);
  const res = await axios
    .post<string, AxiosResponse<{ readonly code?: number }>>(
      url.replace(/\w*api/, "weapi"),
      new URLSearchParams(weapi(data)).toString(),
      { proxy: false, headers }
    )
    .catch(logError);
  if (!res) return;
  const status = res.data.code || res.status;
  if (!spStatus.has(status)) return;
  if ("set-cookie" in res.headers) {
    const cookie = cookieToJson(
      res.headers["set-cookie"] as unknown as string[]
    );
    loginStatus(JSON.stringify(cookie))
      .then(() => broadcastProfiles())
      .catch(logError);
  }
  return status;
};

export const weapiRequest = async <T = QueryInput>(
  url: string,
  data: QueryInput = {},
  cookie = AccountState.defaultCookie
): Promise<T | void> => {
  url = `${APISetting.apiProtocol}://${url}`;
  const headers = generateHeader(url);
  headers["Cookie"] = jsonToCookie(cookie);
  const csrfToken = csrfTokenReg.exec(headers["Cookie"]);
  data.csrf_token = csrfToken ? csrfToken[1] : "";
  return await responseHandler<T>(
    url.replace(/\w*api/, "weapi"),
    headers,
    weapi(data)
  );
};

export const eapiRequest = async <T = QueryInput>(
  url: string,
  data: QueryInput,
  encryptUrl: string,
  rawCookie = AccountState.defaultCookie
): Promise<T | void> => {
  url = `${APISetting.apiProtocol}://${url}`;
  const cookie: NeteaseTypings.Cookie = {
    ...rawCookie,
    ...("MUSIC_U" in rawCookie
      ? // eslint-disable-next-line @typescript-eslint/naming-convention
        { MUSIC_U: rawCookie.MUSIC_U }
      : {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          MUSIC_A:
            "8aae43f148f990410b9a2af38324af24e87ab9227c9265627ddd10145db744295fcd8701dc45b1ab8985e142f491516295dd965bae848761274a577a62b0fdc54a50284d1e434dcc04ca6d1a52333c9a", // anonymousToken
          // eslint-disable-next-line @typescript-eslint/naming-convention
          _ntes_nuid: randomBytes(16).toString("hex"),
        }),
  };
  const now = Date.now();
  const header = {
    appver: "8.7.01",
    versioncode: "140",
    buildver: now.toString().substr(0, 10),
    resolution: "1920x1080",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __csrf: "",
    os: "android" as const,
    requestId: `${now}_${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(4, "0")}`,
    ...cookie,
  };
  const headers = generateHeader(url);
  headers["Cookie"] = jsonToCookie(header);
  return responseHandler<T>(
    url.replace(/\w*api/, "eapi"),
    headers,
    eapi(encryptUrl, { ...data, header }),
    true
  );
};

export const apiRequest = async <T = QueryInput>(
  url: string,
  data: QueryInput = {},
  cookie = AccountState.defaultCookie
): Promise<T | void> => {
  url = `${APISetting.apiProtocol}://${url}`;
  const headers = generateHeader(url);
  headers["Cookie"] = jsonToCookie(cookie);
  return responseHandler<T>(url, headers, data);
};
