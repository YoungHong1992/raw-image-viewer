import { expect, test } from '@playwright/test';
import {
  CANVAS,
  canvasCentre,
  canvasTransform,
  clickZoomControl,
  controls,
  hoverPixel,
  loadImage,
  openWebview,
  renderImage,
  status,
} from './helpers/webview.js';

/** A 256 byte ramp rendered 16x16: the sample value equals the sample index. */
const RAMP_16x16 = 256;
const VGA_GRAY = { length: 640 * 480, fileName: 'sensor_640x480_8bit_gray.raw' };

function parseTransform(transform) {
  const match = transform.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/);
  if (!match) {
    throw new Error(`Unexpected canvas transform: ${transform}`);
  }

  return { x: Number(match[1]), y: Number(match[2]), scale: Number(match[3]) };
}

/** Dispatches a mouse move at exact client coordinates, bypassing hit testing. */
function moveToPoint(page, clientX, clientY) {
  return page.locator(CANVAS).evaluate(
    (canvas, point) => {
      canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: point.x, clientY: point.y }));
    },
    { x: clientX, y: clientY }
  );
}

async function drag(page, deltaX, deltaY) {
  const centre = await canvasCentre(page);
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x + deltaX, centre.y + deltaY, { steps: 5 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await openWebview(page);
});

test('wheel zoom steps by 20% and keeps the pointer anchored', async ({ page }) => {
  await renderImage(page, { length: RAMP_16x16, width: 16, height: 16, fileName: 'ramp.raw' });
  await clickZoomControl(page, 'Reset zoom');
  await expect(controls(page).zoom).toHaveText('100%');

  const centre = await canvasCentre(page);
  await moveToPoint(page, centre.x, centre.y);
  const anchored = await status(page).cursor.textContent();

  await page.mouse.move(centre.x, centre.y);
  await page.mouse.wheel(0, -120);
  await expect(controls(page).zoom).toHaveText('120%');

  // Zooming in around the pointer must keep the same image pixel underneath it.
  await moveToPoint(page, centre.x, centre.y);
  await expect(status(page).cursor).toHaveText(anchored);

  await page.mouse.wheel(0, -120);
  await expect(controls(page).zoom).toHaveText('144%');

  // 144% * 0.8 = 115.2%, which the label rounds to 115%.
  await page.mouse.wheel(0, 120);
  await expect(controls(page).zoom).toHaveText('115%');

  // 115.2% * 0.8 = 92.16% is below the 1:1 floor this image is clamped to.
  await page.mouse.wheel(0, 120);
  await expect(controls(page).zoom).toHaveText('100%');
});

test('wheel zoom clamps to the maximum zoom', async ({ page }) => {
  await renderImage(page, { length: RAMP_16x16, width: 16, height: 16, fileName: 'ramp.raw' });
  await clickZoomControl(page, 'Reset zoom');

  const centre = await canvasCentre(page);
  await page.mouse.move(centre.x, centre.y);
  for (let step = 0; step < 25; step += 1) {
    await page.mouse.wheel(0, -120);
  }

  await expect(controls(page).zoom).toHaveText('3200%');
});

test('wheel zoom clamps at 1:1 for images that are smaller than the window', async ({ page }) => {
  await renderImage(page, { length: RAMP_16x16, width: 16, height: 16, fileName: 'ramp.raw' });
  await clickZoomControl(page, 'Reset zoom');

  const centre = await canvasCentre(page);
  await page.mouse.move(centre.x, centre.y);
  for (let step = 0; step < 25; step += 1) {
    await page.mouse.wheel(0, 120);
  }

  await expect(controls(page).zoom).toHaveText('100%');
  expect(parseTransform(await canvasTransform(page)).scale).toBe(1);
});

test('keyboard shortcuts zoom in, zoom out and reset', async ({ page }) => {
  await renderImage(page, { length: RAMP_16x16, width: 16, height: 16, fileName: 'ramp.raw' });
  await clickZoomControl(page, 'Reset zoom');
  await expect(controls(page).zoom).toHaveText('100%');

  await page.keyboard.press('Control+=');
  await expect(controls(page).zoom).toHaveText('150%');

  await page.keyboard.press('Control+=');
  await expect(controls(page).zoom).toHaveText('225%');

  // 225% * 0.75 = 168.75%, which the label rounds to 169%.
  await page.keyboard.press('Control+-');
  await expect(controls(page).zoom).toHaveText('169%');

  await page.keyboard.press('Control+0');
  await expect(controls(page).zoom).toHaveText('100%');
  expect(parseTransform(await canvasTransform(page)).scale).toBe(1);
});

test('dragging pans the image by the pointer delta', async ({ page }) => {
  await renderImage(page, { ...VGA_GRAY, width: 640, height: 480 });
  await clickZoomControl(page, 'Reset zoom');

  const before = parseTransform(await canvasTransform(page));
  await drag(page, 60, 40);
  const after = parseTransform(await canvasTransform(page));

  expect(after.scale).toBe(before.scale);
  expect(after.x - before.x).toBeCloseTo(60, 3);
  expect(after.y - before.y).toBeCloseTo(40, 3);
});

test('leaving the canvas clears the cursor and pixel readout', async ({ page }) => {
  await renderImage(page, { length: RAMP_16x16, width: 16, height: 16, fileName: 'ramp.raw' });
  await clickZoomControl(page, 'Reset zoom');

  // Real pointer moves, so the browser maintains the hover chain for the canvas.
  const centre = await canvasCentre(page);
  await page.mouse.move(centre.x, centre.y);
  await expect(status(page).cursor).not.toHaveText('Cursor: (-1, -1)');
  await expect(status(page).pixel).not.toHaveText('Pixel: (0, 0, 0)');

  await page.mouse.move(10, 10);

  await expect(status(page).cursor).toHaveText('Cursor: (-1, -1)');
  await expect(status(page).pixel).toHaveText('Pixel: (0, 0, 0)');
});

test('resizing the window refits the image', async ({ page }) => {
  await renderImage(page, { ...VGA_GRAY, width: 640, height: 480 });
  await clickZoomControl(page, 'Reset zoom');
  await expect(controls(page).zoom).toHaveText('100%');

  await page.setViewportSize({ width: 900, height: 700 });

  // The refit runs 100ms after the resize event, so poll instead of sleeping.
  const zoom = controls(page).zoom;
  await expect(zoom).not.toHaveText('100%');
  const refitted = await zoom.textContent();

  await clickZoomControl(page, 'Fit to window');
  await expect(zoom).toHaveText(refitted);
});

test('applies a resolution picked from the common sizes list', async ({ page }) => {
  await renderImage(page, { length: RAMP_16x16, width: 64, height: 4, fileName: 'ramp.raw' });

  const square = controls(page).sizes.filter({ hasText: /^16×16\s*\(/ });
  await expect(square).toHaveCount(1);
  await square.click();

  await expect(controls(page).width).toHaveValue('16');
  await expect(controls(page).height).toHaveValue('16');
  await expect(square).toHaveClass(/active/);
  // Picking a common size applies straight away, without pressing Apply.
  await expect(status(page).imageSize).toHaveText('Image: 16×16');
});

test('swapping width and height waits for Apply', async ({ page }) => {
  await renderImage(page, { length: RAMP_16x16, width: 128, height: 2, fileName: 'ramp.raw' });
  await expect(status(page).imageSize).toHaveText('Image: 128×2');

  await controls(page).swap.click();

  await expect(controls(page).width).toHaveValue('2');
  await expect(controls(page).height).toHaveValue('128');
  await expect(status(page).imageSize).toHaveText('Image: 128×2');

  await expect(controls(page).apply).toBeEnabled();
  await controls(page).apply.click();
  await expect(status(page).imageSize).toHaveText('Image: 2×128');
});

test('hover reports the rendered pixel while a new resolution is pending', async ({ page }) => {
  await renderImage(page, { length: RAMP_16x16, width: 16, height: 16, fileName: 'ramp.raw' });
  await clickZoomControl(page, 'Reset zoom');

  await hoverPixel(page, 1, 1);
  await expect(status(page).pixel).toHaveText('Pixel: (17, 17, 17)');

  // The canvas keeps the old resolution until Apply, so the readout must too.
  await controls(page).width.fill('100');
  await expect(controls(page).apply).toBeDisabled();
  await expect(status(page).imageSize).toHaveText('Image: 16×16');

  await hoverPixel(page, 1, 1);
  await expect(status(page).cursor).toHaveText('Cursor: (1, 1)');
  await expect(status(page).pixel).toHaveText('Pixel: (17, 17, 17)');

  // After applying, the same pointer position follows the new canvas layout.
  await controls(page).height.fill('8');
  await expect(controls(page).apply).toBeEnabled();
  await controls(page).apply.click();
  await expect(status(page).imageSize).toHaveText('Image: 32×8');

  await hoverPixel(page, 1, 1);
  await expect(status(page).pixel).toHaveText('Pixel: (33, 33, 33)');
});

test('shows the file size in a readonly field', async ({ page }) => {
  await loadImage(page, VGA_GRAY);

  const fileBytes = controls(page).fileBytes;
  await expect(fileBytes).toHaveAttribute('readonly', '');
  await expect(fileBytes).toHaveValue('300 KB (307200 bytes)');
  await expect(status(page).file).toHaveText('File: 300 KB');
});
