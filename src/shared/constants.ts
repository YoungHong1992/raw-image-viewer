/**
 * 扩展常量定义
 */
export const EXTENSION_ID = 'raw-image-viewer';
export const VIEW_TYPE = 'raw-image-viewer.rawImage';

export const SUPPORTED_BITS_PER_PIXEL = [8, 10, 12, 14, 16] as const;

export const PIXEL_FORMATS = [
  'grayscale',
  'rgb', 
  'rggb',
  'grbg', 
  'gbrg',
  'bggr'
] as const;

export const COMMON_RESOLUTIONS = [
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
] as const;