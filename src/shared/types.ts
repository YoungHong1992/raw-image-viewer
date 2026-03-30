/**
 * 扩展和webview之间的消息类型定义
 */
export interface WebviewMessage {
  type: string;
  body?: any;
  requestId?: number;
}

export interface InitMessage extends WebviewMessage {
  type: 'init';
  body: {
    value: Uint8Array;
    editable: boolean;
    /** VS Code UI language (e.g. "en", "en-us", "zh-cn") */
    locale?: string;
    /** File basename for heuristics and UI defaults */
    fileName?: string;
  };
}

export interface ReadyMessage extends WebviewMessage {
  type: 'ready';
}

export interface ResponseMessage extends WebviewMessage {
  type: 'response';
  requestId: number;
  body: any;
}

/**
 * 图像参数类型
 */
export type PixelFormat = 'grayscale' | 'rgb' | 'rggb' | 'grbg';

export type StorageMode = 'packed' | 'word16';

export interface ImageParams {
  width: number;
  height: number;
  bitsPerPixel: number;
  pixelFormat: PixelFormat;
  storageMode: StorageMode;
}

/**
 * 分辨率预设
 */
export interface Resolution {
  name: string;
  width: number;
  height: number;
}

export interface ResolutionCandidate extends Resolution {
  ratio: string;
  source: 'preset' | 'factor';
}

/**
 * 扩展配置设置
 */
export interface ExtensionConfig {
  enableBinSupport: boolean;
}
