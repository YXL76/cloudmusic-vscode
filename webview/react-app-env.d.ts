/// <reference types="react-scripts" />

declare interface VsCodeApi {
  postMessage(msg: unknown): unknown;
  setState(newState: unknown): unknown;
  getState(): unknown;
}

interface Window {
  webview: {
    vscode: VsCodeApi;
    entry: "userMusicRankingList";
    language: string;
    data: unknown;
  };
}
