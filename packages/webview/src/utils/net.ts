import type { CSConnPool, CSMessage } from "@cloudmusic/shared";

export const vscode = acquireVsCodeApi();

const requestPool = new Map() as CSConnPool;

export function startEventListener(): void {
  window.addEventListener("message", ({ data }: MessageEvent<CSMessage<unknown>>) => {
    const req = requestPool.get(data.channel);
    if (!req) return;
    requestPool.delete(data.channel);
    if (("err" in data && data.err) || !("msg" in data)) req.reject();
    else req.resolve(data.msg);
  });
}

let nextChan = 0;
export function request<T = undefined, U = undefined>(msg: U): Promise<T> {
  const channel = ++nextChan;
  return new Promise((resolve, reject) => {
    requestPool.set(channel, { resolve, reject });
    const x: CSMessage<U> = { msg, channel };
    vscode.postMessage(x);
  });
}
