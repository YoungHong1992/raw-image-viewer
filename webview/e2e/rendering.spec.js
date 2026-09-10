import { expect, test } from '@playwright/test';
import {
  canvasPixel,
  controls,
  hoverPixel,
  loadImage,
  openWebview,
  selectBitDepth,
  selectStorageMode,
  setResolution,
  status,
} from './helpers/webview.js';

const BAYER_TILE = [10, 200, 20, 210, 30, 100, 40, 110, 50, 220, 60, 230, 15, 105, 25, 115];
const RGGB_TILE = [200, 50, 220, 40, 60, 10, 70, 20, 240, 80, 230, 90, 30, 15, 35, 25];
const GRBG_TILE = [40, 200, 50, 210, 10, 60, 20, 65, 70, 220, 80, 230, 15, 75, 25, 85];

// 10-bit samples 0, 1023, 512, 256 stored MSB-aligned in 16-bit little-endian words.
const TEN_BIT_WORD16 = [0x00, 0x00, 0xc0, 0xff, 0x00, 0x80, 0x00, 0x40];

async function render(page, { bytes, format, width, height, bitsPerPixel = 8, storage = 'Packed bitstream' }) {
  await loadImage(page, { bytes, fileName: 'sensor.raw' });
  await selectBitDepth(page, bitsPerPixel);
  await selectStorageMode(page, storage);
  await controls(page).format.selectOption(format);
  await setResolution(page, width, height);

  await expect(controls(page).apply).toBeEnabled();
  await controls(page).apply.click();
  await expect(status(page).imageSize).toHaveText(`Image: ${width}×${height}`);
}

test.beforeEach(async ({ page }) => {
  await openWebview(page);
});

test('renders an 8-bit grayscale ramp', async ({ page }) => {
  await render(page, {
    bytes: Array.from({ length: 16 }, (_unused, index) => index),
    format: 'grayscale',
    width: 4,
    height: 4,
  });

  await expect.poll(() => canvasPixel(page, 2, 1)).toEqual([6, 6, 6, 255]);
});

test('renders 8-bit RGB triplets', async ({ page }) => {
  await render(page, {
    bytes: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
    format: 'rgb',
    width: 2,
    height: 2,
  });

  await expect.poll(() => canvasPixel(page, 1, 1)).toEqual([100, 110, 120, 255]);
});

test('decodes 10-bit samples stored in a 16-bit container', async ({ page }) => {
  await render(page, {
    bytes: TEN_BIT_WORD16,
    format: 'grayscale',
    width: 2,
    height: 2,
    bitsPerPixel: 10,
    storage: '16-bit container',
  });

  await expect.poll(() => canvasPixel(page, 0, 0)).toEqual([0, 0, 0, 255]);
  await expect.poll(() => canvasPixel(page, 1, 0)).toEqual([255, 255, 255, 255]);
  await expect.poll(() => canvasPixel(page, 0, 1)).toEqual([127, 127, 127, 255]);
  await expect.poll(() => canvasPixel(page, 1, 1)).toEqual([63, 63, 63, 255]);
});

const bayerCases = [
  { format: 'rggb', bytes: RGGB_TILE, expected: [223, 65, 10, 255] },
  { format: 'grbg', bytes: GRBG_TILE, expected: [210, 60, 15, 255] },
  { format: 'gbrg', bytes: BAYER_TILE, expected: [35, 100, 210, 255] },
  { format: 'bggr', bytes: BAYER_TILE, expected: [100, 123, 35, 255] },
];

for (const { format, bytes, expected } of bayerCases) {
  test(`demosaics ${format.toUpperCase()} data`, async ({ page }) => {
    await render(page, { bytes, format, width: 4, height: 4 });

    await expect.poll(() => canvasPixel(page, 1, 1)).toEqual(expected);
  });
}

test('reports the hovered pixel and cursor position', async ({ page }) => {
  await render(page, { bytes: BAYER_TILE, format: 'bggr', width: 4, height: 4 });

  await hoverPixel(page, 1, 1);

  await expect(status(page).pixel).toHaveText('Pixel: (100, 123, 35)');
  await expect(status(page).cursor).toHaveText('Cursor: (1, 1)');
});
