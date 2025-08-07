import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useImageStore = defineStore('image', () => {
  // State
  const rawData = ref(null);
  const fileSize = ref(0);
  const width = ref(2688);
  const height = ref(1520);
  const bitsPerPixel = ref(10);
  const pixelFormat = ref('grayscale');
  const ready = ref(false);
  const error = ref(null);

  const canvasWidth = ref(0);
  const canvasHeight = ref(0);
  const pixelR = ref(0);
  const pixelG = ref(0);
  const pixelB = ref(0);
  const cursorX = ref(0);
  const cursorY = ref(0);

  const commonResolutions = ref([
    { name: 'VGA', width: 640, height: 480 },
    { name: 'HD', width: 1280, height: 720 },
    { name: 'Full HD', width: 1920, height: 1080 },
    { name: '4K UHD', width: 3840, height: 2160 },
    { name: '8K UHD', width: 7680, height: 4320 },
    { name: 'QVGA', width: 320, height: 240 },
    { name: 'SVGA', width: 800, height: 600 },
    { name: 'XGA', width: 1024, height: 768 },
    { name: 'SXGA', width: 1280, height: 1024 },
    { name: 'UXGA', width: 1600, height: 1200 },
    { name: '2K', width: 2048, height: 1080 },
    { name: 'Cinema 4K', width: 4096, height: 2160 },
    { name: '5MP', width: 2592, height: 1944 },
    { name: '8MP', width: 3264, height: 2448 },
    { name: '12MP', width: 4000, height: 3000 },
    { name: '16MP', width: 4920, height: 3264 },
    { name: '20MP', width: 5184, height: 3888 },
    { name: 'IMX290', width: 1920, height: 1080 },
    { name: 'IMX385', width: 1920, height: 1080 },
    { name: 'IMX462', width: 1920, height: 1080 },
    { name: 'IMX464', width: 2688, height: 1520 },
    { name: 'IMX678', width: 3840, height: 2160 },
  ]);

  const availableBits = ref([8, 10, 12, 14, 16]);

  // Actions
  function setRawData(data) {
    rawData.value = data;
    fileSize.value = data.length;
    error.value = null; // Clear error on new file
  }

  function validateParams() {
    if (!fileSize.value || !width.value || !height.value || !bitsPerPixel.value) {
      error.value = '参数无效';
      return false;
    }
    const bytesPerPixelVal = Math.ceil(bitsPerPixel.value / 8);
    const requiredBytes = width.value * height.value * bytesPerPixelVal * (pixelFormat.value === 'rgb' ? 3 : 1);

    if (fileSize.value < requiredBytes) {
      error.value = `错误: 文件大小与参数不匹配。需要 ${requiredBytes} 字节, 但文件只有 ${fileSize.value} 字节。`;
      return false;
    }

    error.value = null;
    return true;
  }

  return {
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
    commonResolutions,
    availableBits,
    setRawData,
    validateParams,
  };
});
