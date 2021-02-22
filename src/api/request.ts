import type { Cookie, OS } from ".";
import { anonymousToken, cookieToJson, eapi, jsonToCookie, weapi } from ".";
import { AccountManager } from "../manager";
import type { ParsedUrlQueryInput } from "querystring";
import axios from "axios";
import { Agent as httpAgent } from "http";
import { Agent as httpsAgent } from "https";
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
    ...(url.startsWith("https://music.163.com/")
      ? // eslint-disable-next-line @typescript-eslint/naming-convention
        { Referer: "https://music.163.com" }
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
    httpAgent: new httpAgent({ keepAlive: true }),
    httpsAgent: new httpsAgent({ keepAlive: true }),
    ...(eapi ? { encoding: null } : {}),
  });

  const status = res.data.code || res.status;

  if ([200, 800, 803].includes(status)) {
    if ("set-cookie" in res.headers) {
      AccountManager.cookie = {
        ...AccountManager.cookie,
        ...cookieToJson(
          (res.headers as { "set-cookie": string[] })["set-cookie"]
        ),
      };
    }
    return res.data;
  }
  throw status;
};

export const weapiRequest = async <T = ParsedUrlQueryInput>(
  url: string,
  data: ParsedUrlQueryInput,
  os?: OS
): Promise<T> => {
  const headers = generateHeader(url);
  headers["Cookie"] = jsonToCookie({
    ...AccountManager.cookie,
    ...(os ? { os } : {}),
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
  os?: OS
): Promise<T> => {
  const cookie: Cookie = {
    ...AccountManager.cookie,
    ...(os ? { os } : {}),
    ...("MUSIC_U" in AccountManager.cookie
      ? // eslint-disable-next-line @typescript-eslint/naming-convention
        { MUSIC_U: AccountManager.cookie.MUSIC_U }
      : {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          MUSIC_A: anonymousToken,
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
  const headers = generateHeader(url);
  headers["Cookie"] = jsonToCookie(AccountManager.cookie);
  return responseHandler<T>(url, headers, data);
};
