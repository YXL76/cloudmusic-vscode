import type { AxiosProxyConfig } from "axios";
import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";

export class APISetting {
  private static _apiProtocol: "http" | "https" = "https";

  static get apiProtocol(): "http" | "https" {
    return APISetting._apiProtocol;
  }

  static set apiProtocol(value: "http" | "https") {
    APISetting._apiProtocol = value;
  }

  private static _proxy?: AxiosProxyConfig | false = undefined;

  public static get proxy(): AxiosProxyConfig | false | undefined {
    return APISetting._proxy;
  }

  private static _httpAgent = new HttpAgent({ keepAlive: true });

  public static get httpAgent(): HttpAgent {
    return APISetting._httpAgent;
  }

  private static _httpsAgent = new HttpsAgent({ keepAlive: true });

  static get httpsAgent(): HttpsAgent {
    return APISetting._httpsAgent;
  }
}
