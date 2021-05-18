import { AccountState, cookieToJson, jsonToCookie } from "./helper";
import { eapi, weapi } from "./crypto";
import { APISetting } from "..";
import { IPCServer } from "../..";
import type { NeteaseTypings } from "api";
import type { ParsedUrlQueryInput } from "querystring";
import axios from "axios";
import { randomBytes } from "crypto";
import { stringify } from "querystring";

const userAgentList = [
  // macOS 10.15.6  Firefox / Chrome / Safari
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:80.0) Gecko/20100101 Firefox/80.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.30 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.2 Safari/605.1.15",
  // Windows 10 Firefox / Chrome / Edge
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:80.0) Gecko/20100101 Firefox/80.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.30 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/13.10586",
];

export const userAgent =
  userAgentList[Math.floor(Math.random() * userAgentList.length)];

const csrfTokenReg = RegExp(/_csrf=([^(;|$)]+)/);

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
  "X-Real-IP": string;
};

export const generateHeader = (url: string): Headers => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Cookie: "",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "Content-Type": "application/x-www-form-urlencoded",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "User-Agent": userAgent,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "X-Real-IP": "118.88.88.88",
    ...(url.startsWith("music.163.com/")
      ? // eslint-disable-next-line @typescript-eslint/naming-convention
        { Referer: "music.163.com" }
      : {}),
  };
};

const responseHandler = async <T>(
  url: string,
  headers: Headers,
  data: ParsedUrlQueryInput,
  eapi?: boolean
): Promise<T> => {
  const res = await axios.post<{ code?: number } & T>(url, stringify(data), {
    withCredentials: true,
    headers,
    ...APISetting.agent,
    ...(eapi ? { encoding: null } : {}),
  });

  const status = res.data.code || res.status;

  if ([200, 800, 803].includes(status)) {
    if ("set-cookie" in res.headers) {
      AccountState.cookie = {
        ...AccountState.cookie,
        ...cookieToJson(
          (res.headers as { "set-cookie": readonly string[] })["set-cookie"]
        ),
      };
      IPCServer.broadcast({
        t: "control.cookie",
        cookie: JSON.stringify(AccountState.cookie),
      });
    }
    return res.data;
  }
  throw status;
};

export const weapiRequest = async <T = ParsedUrlQueryInput>(
  url: string,
  data: ParsedUrlQueryInput,
  extraCookie: { os?: NeteaseTypings.OS; appver?: string } = {}
): Promise<T> => {
  url = `${APISetting.apiProtocol}://${url}`;

  const headers = generateHeader(url);
  headers["Cookie"] = jsonToCookie({
    ...AccountState.cookie,
    ...extraCookie,
  });
  const csrfToken = csrfTokenReg.exec(headers["Cookie"]);
  data.csrf_token = csrfToken ? csrfToken[1] : "";
  return await responseHandler<T>(
    url.replace(/\w*api/, "weapi"),
    headers,
    weapi(data)
  );
};

export const eapiRequest = async <T = ParsedUrlQueryInput>(
  url: string,
  data: ParsedUrlQueryInput & { header?: ParsedUrlQueryInput },
  encryptUrl: string,
  os?: NeteaseTypings.OS
): Promise<T> => {
  url = `${APISetting.apiProtocol}://${url}`;

  const cookie: NeteaseTypings.Cookie = {
    ...AccountState.cookie,
    ...(os ? { os } : {}),
    ...("MUSIC_U" in AccountState.cookie
      ? // eslint-disable-next-line @typescript-eslint/naming-convention
        { MUSIC_U: AccountState.cookie.MUSIC_U }
      : {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          MUSIC_A:
            "8aae43f148f990410b9a2af38324af24e87ab9227c9265627ddd10145db744295fcd8701dc45b1ab8985e142f491516295dd965bae848761274a577a62b0fdc54a50284d1e434dcc04ca6d1a52333c9a", // anonymousToken
          // eslint-disable-next-line @typescript-eslint/naming-convention
          _ntes_nuid: randomBytes(16).toString("hex"),
        }),
  };
  const headers = generateHeader(url);
  const header = {
    appver: "8.1.20",
    versioncode: "140",
    buildver: Date.now().toString().substr(0, 10),
    resolution: "1920x1080",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __csrf: "",
    os: "android" as const,
    requestId: `${Date.now()}_${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(4, "0")}`,
    ...cookie,
  };
  headers["Cookie"] = jsonToCookie(header);
  data.header = header;
  return responseHandler<T>(
    url.replace(/\w*api/, "eapi"),
    headers,
    eapi(encryptUrl, data),
    true
  );
};

export const apiRequest = async <T = ParsedUrlQueryInput>(
  url: string,
  data: ParsedUrlQueryInput
): Promise<T> => {
  url = `${APISetting.apiProtocol}://${url}`;

  const headers = generateHeader(url);
  headers["Cookie"] = jsonToCookie(AccountState.cookie);
  return responseHandler<T>(url, headers, data);
};
