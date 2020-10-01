/// <reference types="react-scripts" />

declare interface VsCodeApi {
  postMessage<T>(msg: T): T;
  setState<T>(newState: T): T;
  getState(): unknown;
}

interface Window {
  webview: {
    vscode: VsCodeApi;
    entry: "userMusicRankingList" | "commentList";
    language: string;
    data: {
      i18n?: Record<string, string>;
      message?: {
        limit?: number;
      };
    };
  };
}
