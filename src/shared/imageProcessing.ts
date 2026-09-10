import { ImageParams, PixelFormat } from './types';
import { calculateRequiredBytes } from './utils';

function normalizeToByte(sample: number, bitsPerPixel: number): number {
  const maxValue = Math.pow(2, bitsPerPixel) - 1;
  if (maxValue <= 0) {
    return 0;
  }

  return Math.min(255, Math.floor((sample / maxValue) * 255));
}

export function readSample(
  data: Uint8Array,
  sampleIndex: number,
  bitsPerPixel: number,
  storageMode: ImageParams['storageMode']
): number {
  if (storageMode === 'word16') {
    const byteOffset = sampleIndex * 2;
    if (byteOffset + 1 >= data.length) {
      return 0;
    }

    const rawValue = data[byteOffset] | (data[byteOffset + 1] << 8);
    if (bitsPerPixel >= 16) {
      return rawValue;
    }

    return rawValue >> (16 - bitsPerPixel);
  }

  const startBit = sampleIndex * bitsPerPixel;
  let value = 0;

  for (let offset = 0; offset < bitsPerPixel; offset += 1) {
    const absoluteBit = startBit + offset;
    const byteIndex = Math.floor(absoluteBit / 8);
    const bitIndex = 7 - (absoluteBit % 8);
    const bit = byteIndex < data.length ? (data[byteIndex] >> bitIndex) & 1 : 0;
    value = (value << 1) | bit;
  }

  return value;
}

function buildNormalizedSamples(
  data: Uint8Array,
  totalSamples: number,
  bitsPerPixel: number,
  storageMode: ImageParams['storageMode']
): Uint8Array {
  const normalized = new Uint8Array(totalSamples);

  for (let index = 0; index < totalSamples; index += 1) {
    normalized[index] = normalizeToByte(readSample(data, index, bitsPerPixel, storageMode), bitsPerPixel);
  }

  return normalized;
}

type BayerSite = 'r' | 'b' | 'g-r' | 'g-b';

/**
 * 2x2 图块按行优先排列：(0,0), (0,1), (1,0), (1,1)
 * 'g-r' 表示绿点横向邻居为红，'g-b' 表示绿点横向邻居为蓝
 */
const BAYER_SITES: Record<Exclude<PixelFormat, 'grayscale' | 'rgb'>, [BayerSite, BayerSite, BayerSite, BayerSite]> = {
  rggb: ['r', 'g-r', 'g-b', 'b'],
  grbg: ['g-r', 'r', 'b', 'g-b'],
  gbrg: ['g-b', 'b', 'r', 'g-r'],
  bggr: ['b', 'g-b', 'g-r', 'r']
};

function getBayerSite(pixelFormat: PixelFormat, x: number, y: number): BayerSite {
  const sites = BAYER_SITES[pixelFormat as keyof typeof BAYER_SITES];

  if (!sites) {
    throw new Error(`Unsupported Bayer format: ${pixelFormat}`);
  }

  return sites[(y % 2) * 2 + (x % 2)];
}

function renderGrayscale(normalizedSamples: Uint8Array, width: number, height: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < normalizedSamples.length; index += 1) {
    const outputIndex = index * 4;
    const value = normalizedSamples[index];

    pixels[outputIndex] = value;
    pixels[outputIndex + 1] = value;
    pixels[outputIndex + 2] = value;
    pixels[outputIndex + 3] = 255;
  }

  return pixels;
}

function renderRgb(normalizedSamples: Uint8Array, width: number, height: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    const sampleIndex = pixelIndex * 3;
    const outputIndex = pixelIndex * 4;

    pixels[outputIndex] = normalizedSamples[sampleIndex] ?? 0;
    pixels[outputIndex + 1] = normalizedSamples[sampleIndex + 1] ?? 0;
    pixels[outputIndex + 2] = normalizedSamples[sampleIndex + 2] ?? 0;
    pixels[outputIndex + 3] = 255;
  }

  return pixels;
}

function renderBayer(normalizedSamples: Uint8Array, width: number, height: number, pixelFormat: PixelFormat): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);

  const getValue = (x: number, y: number): number | null => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return null;
    }

    return normalizedSamples[y * width + x];
  };

  const average = (coords: Array<[number, number]>): number => {
    const values = coords
      .map(([x, y]) => getValue(x, y))
      .filter((value): value is number => value !== null);

    if (values.length === 0) {
      return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const outputIndex = (y * width + x) * 4;
      const value = normalizedSamples[y * width + x] ?? 0;
      const site = getBayerSite(pixelFormat, x, y);

      let r = 0;
      let g = 0;
      let b = 0;

      switch (site) {
        case 'r':
          r = value;
          g = average([[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]]);
          b = average([[x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]]);
          break;
        case 'b':
          b = value;
          g = average([[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]]);
          r = average([[x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]]);
          break;
        case 'g-r':
          g = value;
          r = average([[x - 1, y], [x + 1, y]]);
          b = average([[x, y - 1], [x, y + 1]]);
          break;
        case 'g-b':
          g = value;
          r = average([[x, y - 1], [x, y + 1]]);
          b = average([[x - 1, y], [x + 1, y]]);
          break;
      }

      pixels[outputIndex] = Math.round(r);
      pixels[outputIndex + 1] = Math.round(g);
      pixels[outputIndex + 2] = Math.round(b);
      pixels[outputIndex + 3] = 255;
    }
  }

  return pixels;
}

export function renderRawImage(data: Uint8Array, params: ImageParams): Uint8ClampedArray {
  const requiredBytes = calculateRequiredBytes(params);
  if (data.length < requiredBytes) {
    throw new Error(`Insufficient data: expected ${requiredBytes} bytes, got ${data.length} bytes`);
  }

  const totalPixels = params.width * params.height;

  if (params.pixelFormat === 'rgb') {
    const normalizedSamples = buildNormalizedSamples(data, totalPixels * 3, params.bitsPerPixel, params.storageMode);
    return renderRgb(normalizedSamples, params.width, params.height);
  }

  const normalizedSamples = buildNormalizedSamples(data, totalPixels, params.bitsPerPixel, params.storageMode);

  if (params.pixelFormat === 'grayscale') {
    return renderGrayscale(normalizedSamples, params.width, params.height);
  }

  return renderBayer(normalizedSamples, params.width, params.height, params.pixelFormat);
}
