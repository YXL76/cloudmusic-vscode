import type { Cookie, OS } from ".";
import { anonymousToken, cookieToJson, eapi, jsonToCookie, weapi } from ".";
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

const userAgent =
  userAgentList[Math.floor(Math.random() * userAgentList.length)];

export const base = { cookie: {} as Cookie };

const csrfTokenReg = RegExp(/_csrf=([^(;|$)]+)/);

export const generateHeader = (url: string) => {
  return {
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
  } as {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Cookie: string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Referer: string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "Content-Type": string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "User-Agent": string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "X-Real-IP": string;
  };
};

const responseHandler = async <T>(
  url: string,
  headers: Record<string, any>,
  data: any,
  eapi?: boolean
) => {
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
      base.cookie = {
        ...base.cookie,
        ...cookieToJson(
          (res.headers as { "set-cookie": string[] })["set-cookie"].map((x) =>
            x.replace(/\s*Domain=[^(;|$)]+;*/, "")
          )
        ),
      };
    }
    return res.data;
  }
  throw status;
};

export const weapiRequest = async <T = Record<string, any>>(
  url: string,
  data: Record<string, any>,
  os?: OS
) => {
  const headers = generateHeader(url);
  headers["Cookie"] = jsonToCookie({ ...base.cookie, ...(os ? { os } : {}) });
  const csrfToken = csrfTokenReg.exec(headers["Cookie"]);
  data.csrf_token = csrfToken ? csrfToken[1] : "";
  data = weapi(data);
  return await responseHandler<T>(
    url.replace(/\w*api/, "weapi"),
    headers,
    data
  );
};

export const eapiRequest = async <T = Record<string, any>>(
  url: string,
  data: Record<string, any>,
  encryptUrl: string,
  os?: OS
) => {
  const cookie: Cookie = {
    ...base.cookie,
    ...(os ? { os } : {}),
    ...("MUSIC_U" in base.cookie
      ? // eslint-disable-next-line @typescript-eslint/naming-convention
        { MUSIC_U: base.cookie.MUSIC_U }
      : {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          MUSIC_A: anonymousToken,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          _ntes_nuid: randomBytes(16).toString("hex"),
        }),
  };
  const headers = generateHeader(url);
  const header = {
    appver: "8.0.0",
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
  data = eapi(encryptUrl, data);
  return responseHandler<T>(url.replace(/\w*api/, "eapi"), headers, data, true);
};

export const apiRequest = async <T = Record<string, any>>(
  url: string,
  data: Record<string, any>
) => {
  const headers = generateHeader(url);
  headers["Cookie"] = jsonToCookie(base.cookie);
  return responseHandler<T>(url, headers, data);
};
