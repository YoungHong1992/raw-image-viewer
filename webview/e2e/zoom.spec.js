import { expect, test } from '@playwright/test';
import { loadImage, controls, openWebview, status, clickZoomControl, CANVAS } from './helpers/webview.js';

const RAMP_16 = Array.from({ length: 16 }, (_unused, index) => index);
const GRAYSCALE_640x480_BYTES = 640 * 480;

function canvasTransform(page) {
  return page.locator(CANVAS).evaluate((canvas) => canvas.style.transform);
}

async function loadLargeFixture(page) {
  await loadImage(page, {
    length: GRAYSCALE_640x480_BYTES,
    fileName: 'sensor_640x480_8bit_gray.raw',
  });
  await expect(status(page).imageSize).toHaveText('Image: 640×480');
}

test.beforeEach(async ({ page }) => {
  await openWebview(page);
});

test('1:1 zoom is not overwritten by fit-to-window', async ({ page }) => {
  await loadImage(page, { bytes: RAMP_16, fileName: 'sensor.raw' });
  await expect(controls(page).apply).toBeEnabled();

  // A 4x4 image in a ~900x700 container fits at more than 32x, so the initial
  // fit-to-window clamps to the maximum zoom.
  await expect(controls(page).zoom).toHaveText('3200%');

  await clickZoomControl(page, 'Reset zoom');
  await expect(controls(page).zoom).toHaveText('100%');
  await expect.poll(() => canvasTransform(page)).toContain('scale(1)');

  // 1:1 stays the lower bound for tiny images instead of jumping back up.
  await clickZoomControl(page, 'Zoom out');
  await expect(controls(page).zoom).toHaveText('100%');

  await clickZoomControl(page, 'Zoom in');
  await expect(controls(page).zoom).toHaveText('150%');

  await clickZoomControl(page, 'Fit to window');
  await expect(controls(page).zoom).toHaveText('3200%');
});

test('zoom controls stay consistent for a realistic image', async ({ page }) => {
  await loadLargeFixture(page);

  await clickZoomControl(page, 'Fit to window');
  const fitted = await controls(page).zoom.textContent();
  expect(fitted).toMatch(/^\d+%$/);

  await clickZoomControl(page, 'Reset zoom');
  await expect(controls(page).zoom).toHaveText('100%');
  await expect.poll(() => canvasTransform(page)).toContain('scale(1)');

  await clickZoomControl(page, 'Zoom in');
  await expect(controls(page).zoom).toHaveText('150%');

  // 150% * 0.75 = 112.5%, which the label rounds to 113%.
  await clickZoomControl(page, 'Zoom out');
  await expect(controls(page).zoom).toHaveText('113%');

  await clickZoomControl(page, 'Fit to window');
  await expect(controls(page).zoom).toHaveText(fitted);
});
