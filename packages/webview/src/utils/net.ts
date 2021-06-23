import type { CSConnPool, CSMessage } from "@cloudmusic/shared";

export const vscode = acquireVsCodeApi();

const requestPool = new Map() as CSConnPool;

export function startEventListener(): void {
  window.addEventListener(
    "message",
    ({ data: { msg, channel } }: MessageEvent<CSMessage>) => {
      const req = requestPool.get(channel);
      requestPool.delete(channel);
      if (req) req.resolve(msg);
    }
  );
}

export function request<T = undefined, U = undefined>(msg: U): Promise<T> {
  const channel = Date.now();
  return new Promise((resolve, reject) => {
    const prev = requestPool.get(channel);
    prev?.reject();
    requestPool.set(channel, { resolve, reject });
    const x: CSMessage<U> = { msg, channel };
    vscode.postMessage(x);
  });
}
