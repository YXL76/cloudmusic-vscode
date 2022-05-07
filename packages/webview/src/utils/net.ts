import type { CSConnPool, CSMessage } from "@cloudmusic/shared";

export const vscode = acquireVsCodeApi();

const requestPool = new Map() as CSConnPool;

export function startEventListener(): void {
  window.addEventListener(
    "message",
    ({ data: { msg, channel } }: MessageEvent<CSMessage<unknown>>) => {
      const req = requestPool.get(channel);
      if (!req) return;
      requestPool.delete(channel);
      if ((msg as { err?: true })["err"] === true) req.reject();
      else req.resolve(msg);
    }
  );
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
