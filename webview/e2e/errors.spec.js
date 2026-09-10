import { expect, test } from '@playwright/test';
import { controls, loadGeneratedImage, openWebview, status } from './helpers/webview.js';

test.beforeEach(async ({ page }) => {
  await openWebview(page);
});

test('reports a file size mismatch when no resolution fits the file', async ({ page }) => {
  // 104729 is prime, so none of the candidate bit depths divides it into a usable
  // resolution: the initial apply fails and no recommendation can rescue it.
  await loadGeneratedImage(page, { length: 104729, fileName: 'prime.raw' });

  await expect(status(page).error).toBeVisible();
  await expect(status(page).error).toContainText('File size mismatch for 16-bit container');
  await expect(status(page).error).toContainText('got 104729 bytes');

  // The error replaces the whole detail row, so nothing claims to be rendered.
  await expect(status(page).imageSize).toHaveCount(0);
  await expect(status(page).cursor).toHaveCount(0);
  await expect(controls(page).apply).toBeDisabled();
});

test('surfaces a rejected render in the status bar and recovers afterwards', async ({ page }) => {
  // 7500x7000 is 52.5M pixels, just over the 50M pixel render guard.
  await loadGeneratedImage(page, {
    length: 7500 * 7000,
    fileName: 'huge_7500x7000_8bit_gray.raw',
  });

  await expect(status(page).error).toHaveText('Image too large: 7500×7000 exceeds the limit');
  await expect(status(page).imageSize).toHaveCount(0);

  await loadGeneratedImage(page, { length: 256, fileName: 'ramp.raw' });

  await expect(status(page).error).toHaveCount(0);
  await expect(status(page).imageSize).toHaveText('Image: 16×16');
});
