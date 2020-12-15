import type { Cookie, OS } from ".";
import { anonymousToken, eapi, jsonToCookie, linuxapi, weapi } from ".";
import axios from "axios";
import { Agent as httpAgent } from "http";
import { Agent as httpsAgent } from "https";
import { randomBytes } from "crypto";
import { stringify } from "querystring";

export const userAgentList = {
  mobile: [
    // iOS 13.5.1 14.0 beta with safari
    "Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.",
    // iOS with qq micromsg
    "Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML like Gecko) Mobile/14A456 QQ/6.5.7.408 V1_IPH_SQ_6.5.7_1_APP_A Pixel/750 Core/UIWebView NetType/4G Mem/103",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/7.0.15(0x17000f27) NetType/WIFI Language/zh",
    // Android -> Huawei Xiaomi
    "Mozilla/5.0 (Linux; Android 9; PCT-AL10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.64 HuaweiBrowser/10.0.3.311 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; U; Android 9; zh-cn; Redmi Note 8 Build/PKQ1.190616.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/71.0.3578.141 Mobile Safari/537.36 XiaoMi/MiuiBrowser/12.5.22",
    // Android + qq micromsg
    "Mozilla/5.0 (Linux; Android 10; YAL-AL00 Build/HUAWEIYAL-AL00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.62 XWEB/2581 MMWEBSDK/200801 Mobile Safari/537.36 MMWEBID/3027 MicroMessenger/7.0.18.1740(0x27001235) Process/toolsmp WeChat/arm64 NetType/WIFI Language/zh_CN ABI/arm64",
    "Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; BKK-AL10 Build/HONORBKK-AL10) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.126 MQQBrowser/10.6 Mobile Safari/537.36",
  ],
  pc: [
    // macOS 10.15.6  Firefox / Chrome / Safari
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:80.0) Gecko/20100101 Firefox/80.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.30 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.2 Safari/605.1.15",
    // Windows 10 Firefox / Chrome / Edge
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:80.0) Gecko/20100101 Firefox/80.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.30 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/13.10586",
    // Linux 就算了
  ],
};

const allUserAgent = userAgentList.mobile.concat(userAgentList.pc);

export const base = { cookie: {} as Cookie };

const csrfTokenReg = RegExp(/_csrf=([^(;|$)]+)/);

const generateHeader = (url: string) => {
  const headers = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "Content-Type": "application/x-www-form-urlencoded",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "User-Agent": allUserAgent[Math.floor(Math.random() * allUserAgent.length)],
  } as {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Cookie: string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Referer: string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "Content-Type": string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "User-Agent": string;
  };
  if (url.startsWith("https://music.163.com/")) {
    headers["Referer"] = "https://music.163.com";
  }
  return headers;
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

  if (status === 200) {
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
    appver: "6.1.1",
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

export const linuxRequest = async <T = Record<string, any>>(
  url: string,
  data: Record<string, any>,
  os?: OS
) => {
  const cookie: Cookie = { ...base.cookie, ...(os ? { os } : {}) };
  const headers = generateHeader(url);
  headers["User-Agent"] =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36";
  headers["Cookie"] = jsonToCookie(cookie);
  data = linuxapi({
    method: "POST",
    url: url.replace(/\w*api/, "api"),
    params: data,
  });
  return responseHandler<T>(
    "https://music.163.com/api/linux/forward",
    headers,
    data
  );
};
