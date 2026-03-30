import { COMMON_RESOLUTIONS } from './constants';
import { ImageParams, PixelFormat, ResolutionCandidate, StorageMode } from './types';

const MAX_DIMENSION = 32768;

const ASPECT_RATIOS = [
  { ratio: '16:9', value: 16 / 9, priority: 8 },
  { ratio: '16:10', value: 16 / 10, priority: 7 },
  { ratio: '3:2', value: 3 / 2, priority: 6 },
  { ratio: '4:3', value: 4 / 3, priority: 5 },
  { ratio: '1:1', value: 1, priority: 4 },
  { ratio: '5:4', value: 5 / 4, priority: 3 },
  { ratio: '2:1', value: 2, priority: 2 },
  { ratio: '21:9', value: 21 / 9, priority: 1 }
] as const;

const STORAGE_MODE_LABELS = {
  en: {
    packed: 'packed bitstream',
    word16: '16-bit container'
  },
  'zh-cn': {
    packed: '位流打包',
    word16: '16位容器'
  }
} as const;

function normalizeLocale(input: string = 'en'): 'en' | 'zh-cn' {
  return String(input || '').toLowerCase().startsWith('zh') ? 'zh-cn' : 'en';
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const temp = x % y;
    x = y;
    y = temp;
  }

  return x || 1;
}

function describeAspectRatio(width: number, height: number): string {
  const value = width / height;
  const match = ASPECT_RATIOS.find(item => Math.abs(value - item.value) < 0.02);

  if (match) {
    return match.ratio;
  }

  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function getAspectPriority(ratio: string): number {
  const match = ASPECT_RATIOS.find(item => item.ratio === ratio);
  return match?.priority ?? 0;
}

function normalizeResolution(width: number, height: number): { width: number; height: number } {
  if (width >= height) {
    return { width, height };
  }

  return { width: height, height: width };
}

function getStorageModeLabel(locale: string, storageMode: StorageMode): string {
  const lang = normalizeLocale(locale);
  return STORAGE_MODE_LABELS[lang][storageMode];
}

export function getChannelCount(pixelFormat: PixelFormat): number {
  return pixelFormat === 'rgb' ? 3 : 1;
}

/**
 * 计算给定参数所需的字节数
 */
export function calculateRequiredBytes(params: ImageParams): number {
  const totalSamples = params.width * params.height * getChannelCount(params.pixelFormat);

  if (params.storageMode === 'word16') {
    return totalSamples * 2;
  }

  return Math.ceil((totalSamples * params.bitsPerPixel) / 8);
}

export function calculateTotalPixels(
  fileSize: number,
  bitsPerPixel: number,
  pixelFormat: PixelFormat,
  storageMode: StorageMode
): number | null {
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return null;
  }

  const channelCount = getChannelCount(pixelFormat);

  if (storageMode === 'word16') {
    const bytesPerPixel = 2 * channelCount;
    if (fileSize % bytesPerPixel !== 0) {
      return null;
    }

    return fileSize / bytesPerPixel;
  }

  const totalBits = fileSize * 8;
  const bitsPerPixelOnDisk = bitsPerPixel * channelCount;
  if (totalBits % bitsPerPixelOnDisk !== 0) {
    return null;
  }

  return totalBits / bitsPerPixelOnDisk;
}

export function matchesFileSize(params: ImageParams, fileSize: number): boolean {
  return calculateRequiredBytes(params) === fileSize;
}

export function findMatchingResolutions(
  fileSize: number,
  bitsPerPixel: number,
  pixelFormat: PixelFormat,
  storageMode: StorageMode
): ResolutionCandidate[] {
  const totalPixels = calculateTotalPixels(fileSize, bitsPerPixel, pixelFormat, storageMode);
  if (!totalPixels || totalPixels <= 0) {
    return [];
  }

  const presetMatches = COMMON_RESOLUTIONS
    .filter(item => item.width * item.height === totalPixels)
    .map(item => ({
      ...item,
      ratio: describeAspectRatio(item.width, item.height),
      source: 'preset' as const
    }));

  const factorMatches: ResolutionCandidate[] = [];
  const limit = Math.floor(Math.sqrt(totalPixels));

  for (let divisor = 1; divisor <= limit; divisor += 1) {
    if (totalPixels % divisor !== 0) {
      continue;
    }

    const paired = totalPixels / divisor;
    const normalized = normalizeResolution(paired, divisor);

    if (
      normalized.width <= 0 ||
      normalized.height <= 0 ||
      normalized.width > MAX_DIMENSION ||
      normalized.height > MAX_DIMENSION
    ) {
      continue;
    }

    factorMatches.push({
      name: '',
      width: normalized.width,
      height: normalized.height,
      ratio: describeAspectRatio(normalized.width, normalized.height),
      source: 'factor'
    });
  }

  const merged = [...presetMatches, ...factorMatches];
  const unique = merged.filter((candidate, index, items) => {
    return index === items.findIndex(other => other.width === candidate.width && other.height === candidate.height);
  });

  const presetOrder = new Map(COMMON_RESOLUTIONS.map((resolution, index) => [`${resolution.width}x${resolution.height}`, index]));

  return unique.sort((left, right) => {
    if (left.source !== right.source) {
      return left.source === 'preset' ? -1 : 1;
    }

    if (left.source === 'preset' && right.source === 'preset') {
      const leftOrder = presetOrder.get(`${left.width}x${left.height}`) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = presetOrder.get(`${right.width}x${right.height}`) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    }

    const ratioPriority = getAspectPriority(right.ratio) - getAspectPriority(left.ratio);
    if (ratioPriority !== 0) {
      return ratioPriority;
    }

    return right.width - left.width;
  });
}

export function findRecommendedResolution(
  fileSize: number,
  bitsPerPixel: number,
  pixelFormat: PixelFormat,
  storageMode: StorageMode
): ResolutionCandidate | null {
  return findMatchingResolutions(fileSize, bitsPerPixel, pixelFormat, storageMode)[0] ?? null;
}

/**
 * 验证图像参数是否有效
 */
export function validateImageParams(
  params: ImageParams,
  fileSize: number,
  locale: string = 'en'
): { valid: boolean; error?: string } {
  const lang = normalizeLocale(locale);
  const storageModeLabel = getStorageModeLabel(locale, params.storageMode);
  const msg = {
    en: {
      invalidWidth: 'Invalid image width (1-32768)',
      invalidHeight: 'Invalid image height (1-32768)',
      invalidBits: 'Invalid bit depth. Supported: 8, 10, 12, 14, 16',
      invalidFormat: 'Invalid pixel format',
      invalidStorageMode: 'Invalid storage mode',
      fileSizeMismatch: (expected: number, actual: number) =>
        `File size mismatch for ${storageModeLabel}: expected ${expected} bytes, got ${actual} bytes`,
    },
    'zh-cn': {
      invalidWidth: '图像宽度无效 (1-32768)',
      invalidHeight: '图像高度无效 (1-32768)',
      invalidBits: '位深度无效，支持: 8, 10, 12, 14, 16',
      invalidFormat: '像素格式无效',
      invalidStorageMode: '存储方式无效',
      fileSizeMismatch: (expected: number, actual: number) =>
        `${storageModeLabel}的文件大小不匹配: 预期 ${expected} 字节, 实际 ${actual} 字节`,
    }
  }[lang];

  if (!params.width || params.width <= 0 || params.width > MAX_DIMENSION) {
    return { valid: false, error: msg.invalidWidth };
  }

  if (!params.height || params.height <= 0 || params.height > MAX_DIMENSION) {
    return { valid: false, error: msg.invalidHeight };
  }

  if (!params.bitsPerPixel || ![8, 10, 12, 14, 16].includes(params.bitsPerPixel)) {
    return { valid: false, error: msg.invalidBits };
  }

  if (!params.pixelFormat || !['grayscale', 'rgb', 'rggb', 'grbg'].includes(params.pixelFormat)) {
    return { valid: false, error: msg.invalidFormat };
  }

  if (!params.storageMode || !['packed', 'word16'].includes(params.storageMode)) {
    return { valid: false, error: msg.invalidStorageMode };
  }

  const requiredBytes = calculateRequiredBytes(params);
  if (fileSize !== requiredBytes) {
    return { valid: false, error: msg.fileSizeMismatch(requiredBytes, fileSize) };
  }

  return { valid: true };
}
