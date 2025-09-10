/**
 * VS Code WebView API 类型声明
 */
export interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(newState: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

export {};