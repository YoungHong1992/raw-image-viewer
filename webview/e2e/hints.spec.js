import { expect, test } from '@playwright/test';
import { canvasPixel, controls, loadImage, openWebview, status } from './helpers/webview.js';

const activeBitDepth = (page) => page.locator('.bits-btn.active');
const activeStorage = (page) => page.locator('.storage-btn.active');

test.beforeEach(async ({ page }) => {
  await openWebview(page);
});

test('derives width and height from w640h480 file names', async ({ page }) => {
  await loadImage(page, { length: 640 * 480, fileName: 'frame_w640h480_8bit_gray.raw' });

  await expect(status(page).imageSize).toHaveText('Image: 640×480');
  await expect(controls(page).width).toHaveValue('640');
  await expect(controls(page).height).toHaveValue('480');
  await expect(activeBitDepth(page)).toHaveText('8');
  await expect(activeStorage(page)).toHaveText('Packed bitstream');
  await expect(controls(page).format).toHaveValue('grayscale');
  await expect(status(page).file).toHaveText('File: 300 KB');
});

test('reads 10 msb file names as samples in a 16-bit container', async ({ page }) => {
  await loadImage(page, { length: 64 * 64 * 2, fileName: 'sensor_64x64_10msb.raw' });

  // Without the hint the fallback would pick 8-bit packed 128x64 out of this file.
  await expect(status(page).imageSize).toHaveText('Image: 64×64');
  await expect(activeBitDepth(page)).toHaveText('10');
  await expect(activeStorage(page)).toHaveText('16-bit container');
});

test('reads 12 bit packed file names', async ({ page }) => {
  await loadImage(page, { length: 6144, fileName: 'frame_64x64_12bit_packed.raw' });

  await expect(status(page).imageSize).toHaveText('Image: 64×64');
  await expect(activeBitDepth(page)).toHaveText('12');
  await expect(activeStorage(page)).toHaveText('Packed bitstream');
});

test('takes the bayer pattern from the file name', async ({ page }) => {
  await loadImage(page, { length: 256, fileName: 'imx_rggb_16x16_8bit.raw' });

  await expect(controls(page).format).toHaveValue('rggb');
  await expect(status(page).imageSize).toHaveText('Image: 16×16');
  // Ramp read as RGGB: red is byte 0, the green sites average bytes 1 and 16, blue is byte 17.
  await expect.poll(() => canvasPixel(page, 0, 0)).toEqual([0, 9, 17, 255]);
});

test('takes the RGB format from the file name', async ({ page }) => {
  await loadImage(page, { length: 16 * 16 * 3, fileName: 'img_16x16_rgb_8bit.raw' });

  await expect(controls(page).format).toHaveValue('rgb');
  await expect(status(page).imageSize).toHaveText('Image: 16×16');
  // Triplets are read straight through, so the sample value equals the byte value.
  await expect.poll(() => canvasPixel(page, 1, 1)).toEqual([51, 52, 53, 255]);
});

test('ignores file name hints that do not match the file size', async ({ page }) => {
  await loadImage(page, { length: 640 * 480, fileName: 'sensor_640x480_10bit.raw' });

  // 10-bit hints need either 384000 or 614400 bytes, so the fallback wins.
  await expect(status(page).imageSize).toHaveText('Image: 640×480');
  await expect(activeBitDepth(page)).toHaveText('8');
  await expect(activeStorage(page)).toHaveText('Packed bitstream');
});

test('falls back to a recommended resolution when the name carries no hints', async ({ page }) => {
  await loadImage(page, { length: 1280 * 720, fileName: 'frame.raw' });

  await expect(status(page).imageSize).toHaveText('Image: 1280×720');
  await expect(activeBitDepth(page)).toHaveText('8');
  await expect(activeStorage(page)).toHaveText('Packed bitstream');
});

test('maps a regional Chinese locale to zh-cn', async ({ page }) => {
  await loadImage(page, { length: 256, fileName: 'frame.raw', locale: 'zh-Hans' });

  await expect(controls(page).apply).toHaveText('应用设置');
  await expect(page.locator('.controls-panel h3').first()).toHaveText('文件信息');
});

test('falls back to English for unsupported locales', async ({ page }) => {
  await loadImage(page, { length: 256, fileName: 'frame.raw', locale: 'fr' });

  await expect(controls(page).apply).toHaveText('Apply');
  await expect(page.locator('.controls-panel h3').first()).toHaveText('File Info');
});
