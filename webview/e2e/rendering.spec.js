import { expect, test } from '@playwright/test';
import { canvasPixel, hoverPixel, openWebview, renderImage, status } from './helpers/webview.js';

const BAYER_TILE = [10, 200, 20, 210, 30, 100, 40, 110, 50, 220, 60, 230, 15, 105, 25, 115];
const RGGB_TILE = [200, 50, 220, 40, 60, 10, 70, 20, 240, 80, 230, 90, 30, 15, 35, 25];
const GRBG_TILE = [40, 200, 50, 210, 10, 60, 20, 65, 70, 220, 80, 230, 15, 75, 25, 85];

// 10-bit samples 0, 1023, 512, 256 stored MSB-aligned in 16-bit little-endian words.
const TEN_BIT_WORD16 = [0x00, 0x00, 0xc0, 0xff, 0x00, 0x80, 0x00, 0x40];

async function render(page, options) {
  await renderImage(page, { fileName: 'sensor.raw', ...options });
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

// The 6 bytes below hold samples 0/4095/2048/1024 as a packed 12-bit bitstream.
const TWELVE_BIT_PACKED = [0x00, 0x0f, 0xff, 0x80, 0x04, 0x00];
// The same bitstream padded to 8 bytes, which is what the 16-bit container needs.
const TWELVE_BIT_WORD16 = [0x00, 0x0f, 0xff, 0x80, 0x04, 0x00, 0x00, 0x00];

test('decodes 12-bit samples stored in a 16-bit container', async ({ page }) => {
  await render(page, {
    bytes: [0x00, 0x00, 0xf0, 0xff, 0x00, 0x80, 0x00, 0x40],
    format: 'grayscale',
    width: 2,
    height: 2,
    bitsPerPixel: 12,
    storage: '16-bit container',
  });

  await expect.poll(() => canvasPixel(page, 0, 0)).toEqual([0, 0, 0, 255]);
  await expect.poll(() => canvasPixel(page, 1, 0)).toEqual([255, 255, 255, 255]);
  await expect.poll(() => canvasPixel(page, 0, 1)).toEqual([127, 127, 127, 255]);
  await expect.poll(() => canvasPixel(page, 1, 1)).toEqual([63, 63, 63, 255]);
});

test('decodes 16-bit samples without truncation', async ({ page }) => {
  await render(page, {
    bytes: [0x00, 0x00, 0xff, 0xff, 0x00, 0x80, 0x00, 0x04],
    format: 'grayscale',
    width: 2,
    height: 2,
    bitsPerPixel: 16,
    storage: '16-bit container',
  });

  await expect.poll(() => canvasPixel(page, 0, 0)).toEqual([0, 0, 0, 255]);
  await expect.poll(() => canvasPixel(page, 1, 0)).toEqual([255, 255, 255, 255]);
  await expect.poll(() => canvasPixel(page, 0, 1)).toEqual([127, 127, 127, 255]);
  await expect.poll(() => canvasPixel(page, 1, 1)).toEqual([3, 3, 3, 255]);
});

test('decodes a packed 12-bit bitstream', async ({ page }) => {
  await render(page, {
    bytes: TWELVE_BIT_PACKED,
    format: 'grayscale',
    width: 2,
    height: 2,
    bitsPerPixel: 12,
    storage: 'Packed bitstream',
  });

  await expect.poll(() => canvasPixel(page, 0, 0)).toEqual([0, 0, 0, 255]);
  await expect.poll(() => canvasPixel(page, 1, 0)).toEqual([255, 255, 255, 255]);
  await expect.poll(() => canvasPixel(page, 0, 1)).toEqual([127, 127, 127, 255]);
  await expect.poll(() => canvasPixel(page, 1, 1)).toEqual([63, 63, 63, 255]);
});

test('reads the same bitstream differently as 16-bit words', async ({ page }) => {
  await render(page, {
    bytes: TWELVE_BIT_WORD16,
    format: 'grayscale',
    width: 2,
    height: 2,
    bitsPerPixel: 12,
    storage: '16-bit container',
  });

  // Little-endian words 0x0f00 >> 4, 0x80ff >> 4, 0x0004 >> 4, 0x0000 >> 4 out of 4095.
  await expect.poll(() => canvasPixel(page, 0, 0)).toEqual([14, 14, 14, 255]);
  await expect.poll(() => canvasPixel(page, 1, 0)).toEqual([128, 128, 128, 255]);
  await expect.poll(() => canvasPixel(page, 0, 1)).toEqual([0, 0, 0, 255]);
  await expect.poll(() => canvasPixel(page, 1, 1)).toEqual([0, 0, 0, 255]);
});

test('renders 10-bit RGB stored in a 16-bit container', async ({ page }) => {
  await render(page, {
    bytes: [
      0x00, 0x00, 0xc0, 0xff, 0x00, 0x80, // pixel 0: 0, 1023, 512
      0x00, 0x40, 0x00, 0x00, 0xc0, 0xff, // pixel 1: 256, 0, 1023
    ],
    format: 'rgb',
    width: 2,
    height: 1,
    bitsPerPixel: 10,
    storage: '16-bit container',
  });

  await expect.poll(() => canvasPixel(page, 0, 0)).toEqual([0, 255, 127, 255]);
  await expect.poll(() => canvasPixel(page, 1, 0)).toEqual([63, 0, 255, 255]);
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
