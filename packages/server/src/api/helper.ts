export class APISetting {
  static apiProtocol: "http" | "https" = "https";

  static proxy = process.env.GLOBAL_AGENT_HTTP_PROXY
    ? {}
    : { proxy: false as const };
}
