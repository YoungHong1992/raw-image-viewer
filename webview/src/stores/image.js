import { defineStore } from 'pinia';
import { ref } from 'vue';
import { COMMON_RESOLUTIONS, SUPPORTED_BITS_PER_PIXEL, PIXEL_FORMATS, STORAGE_MODES } from '../../../src/shared/constants';
import { validateImageParams } from '../../../src/shared/utils';

export const useImageStore = defineStore('image', () => {
  // i18n
  const locale = ref('en');
  const messages = {
    en: {
      controls: {
        fileInfo: 'File Info',
        fileBytes: 'File bytes:',
        resolution: 'Resolution',
        commonSizes: 'Common sizes:',
        width: 'Width:',
        height: 'Height:',
        swapDimensions: 'Swap width/height',
        bitDepth: 'Bit depth',
        storageMode: 'Sample storage',
        pixelFormat: 'Pixel format',
        apply: 'Apply',
        noPresetFound: 'No valid preset found. Waiting for manual input.',
      },
      storageMode: {
        packed: 'Packed bitstream',
        word16: '16-bit container',
      },
      pixelFormat: {
        grayscale: 'Grayscale',
        rgb: 'RGB',
        rggb: 'RGGB (Bayer)',
        grbg: 'GRBG (Bayer)',
      },
      status: {
        imageSize: 'Image:',
        pixel: 'Pixel:',
        cursor: 'Cursor:',
        file: 'File:',
      },
      viewer: {
        processing: 'Processing image...',
        zoomOut: 'Zoom out',
        zoomIn: 'Zoom in',
        resetZoom: 'Reset zoom',
        fitToWindow: 'Fit to window',
        fit: 'Fit',
        errors: {
          invalidImageParams: 'Invalid image parameters',
          imageTooLarge: 'Image too large: {width}×{height} exceeds the limit',
          dataTooSmall: 'Insufficient data: need {required} bytes, got {actual} bytes',
          processingError: 'Image processing error:',
        }
      },
      errors: {
        invalidFileSize: 'Invalid file size',
      },
      units: {
        bytesSuffix: '{bytes} bytes',
      }
    },
    'zh-cn': {
      controls: {
        fileInfo: '文件信息',
        fileBytes: '文件字节数:',
        resolution: '分辨率设置',
        commonSizes: '常见尺寸:',
        width: '宽度:',
        height: '高度:',
        swapDimensions: '交换宽高',
        bitDepth: '位深度',
        storageMode: '样本存储方式',
        pixelFormat: '像素格式',
        apply: '应用设置',
        noPresetFound: '未找到合法的预设参数，等待用户手动输入',
      },
      storageMode: {
        packed: '位流打包',
        word16: '16位容器',
      },
      pixelFormat: {
        grayscale: '灰度',
        rgb: 'RGB',
        rggb: 'RGGB (Bayer)',
        grbg: 'GRBG (Bayer)',
      },
      status: {
        imageSize: '图像尺寸:',
        pixel: '像素:',
        cursor: '坐标:',
        file: '文件:',
      },
      viewer: {
        processing: '处理图像中...',
        zoomOut: '缩小',
        zoomIn: '放大',
        resetZoom: '重置缩放',
        fitToWindow: '适应窗口',
        fit: '适应',
        errors: {
          invalidImageParams: '无效的图像参数',
          imageTooLarge: '图像尺寸过大: {width}×{height} 超过限制',
          dataTooSmall: '数据不足: 需要 {required} 字节, 实际 {actual} 字节',
          processingError: '图像处理错误:',
        }
      },
      errors: {
        invalidFileSize: '文件大小无效',
      },
      units: {
        bytesSuffix: '{bytes} bytes',
      }
    }
  };

  function normalizeLocale(input) {
    const lang = String(input || '').toLowerCase();
    if (lang.startsWith('zh')) return 'zh-cn';
    return 'en';
  }

  function setLocale(input) {
    locale.value = normalizeLocale(input);
  }

  function t(key, params) {
    const lang = locale.value;
    const dict = messages[lang] || messages.en;
    const fallback = messages.en;

    const readPath = (obj, path) => path.split('.').reduce((acc, part) => (acc && acc[part] != null ? acc[part] : undefined), obj);
    let template = readPath(dict, key);
    if (template == null) template = readPath(fallback, key);
    if (template == null) return key;

    if (params && typeof template === 'string') {
      return template.replace(/\{(\w+)\}/g, (_, name) => (params[name] != null ? String(params[name]) : `{${name}}`));
    }

    return template;
  }

  // 状态
  const rawData = ref(null);
  const fileName = ref('');
  const fileSize = ref(0);
  const width = ref(2688);
  const height = ref(1520);
  const bitsPerPixel = ref(10);
  const storageMode = ref('packed');
  const pixelFormat = ref('grayscale');
  const ready = ref(false);
  const error = ref(null);

  // 画布状态
  const canvasWidth = ref(0);
  const canvasHeight = ref(0);
  const pixelR = ref(0);
  const pixelG = ref(0);
  const pixelB = ref(0);
  const cursorX = ref(0);
  const cursorY = ref(0);

  // 常量（从共享模块导入）
  const commonResolutions = ref(COMMON_RESOLUTIONS);
  const availableBits = ref(SUPPORTED_BITS_PER_PIXEL);
  const availableStorageModes = ref(STORAGE_MODES);
  const availableFormats = ref(PIXEL_FORMATS);

  // 操作
  function setRawData(data) {
    rawData.value = data;
    fileSize.value = data.length;
    error.value = null;
  }

  function setFileName(name) {
    fileName.value = name || '';
  }

  function validateParams() {
    if (!fileSize.value || fileSize.value <= 0) {
      error.value = t('errors.invalidFileSize');
      return false;
    }

    const params = {
      width: width.value,
      height: height.value,
      bitsPerPixel: bitsPerPixel.value,
      pixelFormat: pixelFormat.value,
      storageMode: storageMode.value
    };

    const validation = validateImageParams(params, fileSize.value, locale.value);
    if (!validation.valid) {
      error.value = validation.error;
      return false;
    }

    error.value = null;
    return true;
  }

  return {
    // i18n
    locale,
    setLocale,
    t,

    // 状态
    rawData,
    fileName,
    fileSize,
    width,
    height,
    bitsPerPixel,
    storageMode,
    pixelFormat,
    ready,
    error,
    canvasWidth,
    canvasHeight,
    pixelR,
    pixelG,
    pixelB,
    cursorX,
    cursorY,
    
    // 常量
    commonResolutions,
    availableBits,
    availableStorageModes,
    availableFormats,
    
    // 操作
    setRawData,
    setFileName,
    validateParams,
  };
});
