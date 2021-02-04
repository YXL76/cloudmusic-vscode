export type VsCodeApi = {
  postMessage<T>(msg: T): T;
  setState<T>(newState: T): T;
  getState(): unknown;
};
