import { expect, test } from '@playwright/test';
import {
  controls,
  loadImage,
  messagesToHost,
  openWebview,
  selectBitDepth,
  setResolution,
  status,
} from './helpers/webview.js';

const BGGR_4x4 = [10, 200, 20, 210, 30, 100, 40, 110, 50, 220, 60, 230, 15, 105, 25, 115];
const GRAYSCALE_640x480_BYTES = 640 * 480;

test.beforeEach(async ({ page }) => {
  await openWebview(page);
});

test('announces readiness to the extension host', async ({ page }) => {
  expect(await messagesToHost(page)).toContainEqual({ type: 'ready' });
});

test('exposes every supported pixel format', async ({ page }) => {
  const values = await controls(page)
    .format.locator('option')
    .evaluateAll((options) => options.map((option) => option.value));

  expect(values).toEqual(['grayscale', 'rgb', 'rggb', 'grbg', 'gbrg', 'bggr']);
});

test('exposes every supported bit depth', async ({ page }) => {
  await expect(controls(page).bitDepths).toHaveText(['8', '10', '12', '14', '16']);
});

test('starts on 10-bit samples stored in a 16-bit container', async ({ page }) => {
  await expect(controls(page).bitDepths.filter({ hasText: /^\s*10\s*$/ })).toHaveClass(/active/);
  await expect(page.locator('.storage-btn').filter({ hasText: '16-bit container' })).toHaveClass(/active/);
});

test('cannot apply settings before the file size is known', async ({ page }) => {
  await expect(controls(page).apply).toBeDisabled();
});

test('republishes the original bytes when the host asks for file data', async ({ page }) => {
  await loadImage(page, { bytes: BGGR_4x4, fileName: 'sensor.raw' });
  await expect(controls(page).apply).toBeEnabled();

  await page.evaluate(() => window.postMessage({ type: 'getFileData', requestId: 42 }, '*'));

  await expect
    .poll(() => page.evaluate(() => window.__postedToHost.some((entry) => entry.type === 'response')))
    .toBe(true);

  const response = await page.evaluate(() => {
    const message = window.__postedToHost.find((entry) => entry.type === 'response');
    return { requestId: message.requestId, bytes: Array.from(new Uint8Array(message.body)) };
  });

  expect(response).toEqual({ requestId: 42, bytes: BGGR_4x4 });
});

test('derives resolution, bit depth and format from the file name', async ({ page }) => {
  await loadImage(page, {
    length: GRAYSCALE_640x480_BYTES,
    fileName: 'sensor_640x480_8bit_gray.raw',
  });

  await expect(status(page).imageSize).toHaveText('Image: 640×480');
  await expect(status(page).file).toHaveText('File: 300 KB');
  await expect(controls(page).width).toHaveValue('640');
  await expect(controls(page).height).toHaveValue('480');
});

test('disables Apply when the resolution cannot fit the file size', async ({ page }) => {
  await loadImage(page, { bytes: BGGR_4x4, fileName: 'sensor.raw' });
  await expect(controls(page).apply).toBeEnabled();

  // 16 bytes can never satisfy 100x100 samples in a 16-bit container.
  await selectBitDepth(page, 16);
  await setResolution(page, 100, 100);

  await expect(controls(page).apply).toBeDisabled();
  await expect(controls(page).width).toHaveClass(/invalid/);
});

test('renders the Chinese interface when the host reports zh-cn', async ({ page }) => {
  await loadImage(page, { bytes: BGGR_4x4, fileName: 'sensor.raw', locale: 'zh-cn' });

  await expect(controls(page).apply).toHaveText('应用设置');
  await expect(page.locator('.storage-btn').filter({ hasText: '16位容器' })).toBeVisible();
});
