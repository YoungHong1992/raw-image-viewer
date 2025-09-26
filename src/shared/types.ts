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
export interface ImageParams {
  width: number;
  height: number;
  bitsPerPixel: number;
  pixelFormat: 'grayscale' | 'rgb' | 'rggb' | 'grbg' | 'gbrg' | 'bggr';
}

/**
 * 分辨率预设
 */
export interface Resolution {
  name: string;
  width: number;
  height: number;
}

/**
 * 扩展配置设置
 */
export interface ExtensionConfig {
  enableBinSupport: boolean;
}