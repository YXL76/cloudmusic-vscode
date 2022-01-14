export class APISetting {
  static apiProtocol =
    process.env["CM_HTTPS_API"] === "0"
      ? ("http" as const)
      : ("https" as const);
}
