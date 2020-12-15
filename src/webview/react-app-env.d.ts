declare interface VsCodeApi {
  postMessage<T>(msg: T): T;
  setState<T>(newState: T): T;
  getState(): unknown;
}

declare interface Window {
  webview: {
    vscode: VsCodeApi;
    entry: "userMusicRankingList" | "commentList";
    language: string;
    data: {
      i18n?: Record<string, string>;
      message?: {
        pageSize?: number;
      };
    };
  };
}
