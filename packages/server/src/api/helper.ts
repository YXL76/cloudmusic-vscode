import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";

export class APISetting {
  static apiProtocol: "http" | "https" = "https";

  private static _agent = process.env.GLOBAL_AGENT_HTTP_PROXY
    ? {}
    : {
        httpAgent: new HttpAgent({ keepAlive: true }),
        httpsAgent: new HttpsAgent({ keepAlive: true }),
      };

  public static get agent(): {
    httpAgent?: HttpAgent;
    httpsAgent?: HttpsAgent;
  } {
    return APISetting._agent;
  }
}
