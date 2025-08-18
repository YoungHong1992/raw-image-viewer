import { defineStore } from 'pinia';
import { ref } from 'vue';
import { COMMON_RESOLUTIONS, SUPPORTED_BITS_PER_PIXEL, PIXEL_FORMATS } from '../../../src/shared/constants';
import { validateImageParams } from '../../../src/shared/utils';

export const useImageStore = defineStore('image', () => {
  // 状态
  const rawData = ref(null);
  const fileSize = ref(0);
  const width = ref(2688);
  const height = ref(1520);
  const bitsPerPixel = ref(10);
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
  const availableFormats = ref(PIXEL_FORMATS);

  // 操作
  function setRawData(data) {
    rawData.value = data;
    fileSize.value = data.length;
    error.value = null;
  }

  function validateParams() {
    if (!fileSize.value || fileSize.value <= 0) {
      error.value = '文件大小无效';
      return false;
    }

    const params = {
      width: width.value,
      height: height.value,
      bitsPerPixel: bitsPerPixel.value,
      pixelFormat: pixelFormat.value
    };

    const validation = validateImageParams(params, fileSize.value);
    if (!validation.valid) {
      error.value = validation.error;
      return false;
    }

    error.value = null;
    return true;
  }

  return {
    // 状态
    rawData,
    fileSize,
    width,
    height,
    bitsPerPixel,
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
    availableFormats,
    
    // 操作
    setRawData,
    validateParams,
  };
});