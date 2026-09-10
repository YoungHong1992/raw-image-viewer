import { expect } from '@playwright/test';

export const LAYOUT = '.app-main-layout';
export const CANVAS = 'canvas.raw-image-canvas';

/** Booting the app again in every test keeps state isolated. */
export async function openWebview(page) {
  await page.addInitScript(() => {
    window.__postedToHost = [];
    window.acquireVsCodeApi = () => ({
      postMessage: (message) => window.__postedToHost.push(message),
      getState: () => undefined,
      setState: () => {},
    });
  });

  await page.goto('/');
  await expect(page.locator(LAYOUT)).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__postedToHost))
    .toContainEqual({ type: 'ready' });
}

export function messagesToHost(page) {
  return page.evaluate(() => window.__postedToHost);
}

/**
 * Posts the same `init` payload the extension host sends from provider.ts.
 * Either pass explicit `bytes`, or `length` to generate a 0..255 ramp.
 */
export async function loadImage(page, { bytes, length, fileName = 'fixture.raw', locale = 'en' }) {
  if (!bytes && length) {
    await loadGeneratedImage(page, { length, fileName, locale });
    return;
  }

  await page.evaluate(
    ({ sample, fileName, locale }) => {
      window.postMessage({ type: 'init', body: { value: sample, editable: false, locale, fileName } }, '*');
    },
    {
      sample: Array.from(bytes ?? []),
      fileName,
      locale,
    }
  );
}

export function status(page) {
  return {
    imageSize: page.locator('#image-size'),
    pixel: page.locator('#pixel-info'),
    cursor: page.locator('#cursor-pos'),
    file: page.locator('#file-info'),
    error: page.locator('.status-bar .error-message'),
  };
}

/**
 * Same as loadImage with `length`, but the buffer is allocated and filled inside
 * the page: serialising a multi-megabyte array through evaluate would dominate
 * the runtime.
 */
export async function loadGeneratedImage(page, { length, fileName, locale = 'en' }) {
  await page.evaluate(
    ({ length, fileName, locale }) => {
      const value = new Uint8Array(length);
      for (let index = 0; index < length; index += 1) {
        value[index] = index & 0xff;
      }

      window.postMessage({ type: 'init', body: { value, editable: false, locale, fileName } }, '*');
    },
    { length, fileName, locale }
  );
}

export function controls(page) {
  return {
    width: page.locator('.controls-panel input[type=number]').first(),
    height: page.locator('.controls-panel input[type=number]').nth(1),
    format: page.locator('.controls-panel select'),
    apply: page.locator('button.apply-button'),
    storageModes: page.locator('.storage-btn'),
    bitDepths: page.locator('.bits-btn'),
    sizes: page.locator('.size-btn'),
    swap: page.locator('button.swap-button'),
    fileBytes: page.locator('.controls-panel input.readonly-input'),
    zoom: page.locator('.zoom-controls span'),
  };
}

export function canvasTransform(page) {
  return page.locator(CANVAS).evaluate((canvas) => canvas.style.transform);
}

export async function selectBitDepth(page, bits) {
  await page.locator('.bits-btn').filter({ hasText: new RegExp(`^\\s*${bits}\\s*$`) }).click();
}

export async function selectStorageMode(page, label) {
  await page.locator('.storage-btn').filter({ hasText: label }).click();
}

/** Width/height inputs keep the other axis in sync, so set both to stay exact. */
export async function setResolution(page, width, height) {
  await page.locator('.controls-panel input[type=number]').first().fill(String(width));
  await page.locator('.controls-panel input[type=number]').nth(1).fill(String(height));
}

export function canvasPixel(page, x, y) {
  return page.evaluate(
    ({ x, y }) => {
      const canvas = document.querySelector('canvas.raw-image-canvas');
      const context = canvas.getContext('2d');
      return Array.from(context.getImageData(x, y, 1, 1).data);
    },
    { x, y }
  );
}

/**
 * The canvas is CSS-transformed, so client coordinates have to be scaled by the
 * current zoom to land on the requested image pixel.
 */
export async function hoverPixel(page, x, y) {
  await page.evaluate(
    ({ x, y }) => {
      const canvas = document.querySelector('canvas.raw-image-canvas');
      const rect = canvas.getBoundingClientRect();
      const scale = new DOMMatrix(getComputedStyle(canvas).transform).a || 1;
      canvas.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: rect.left + (x + 0.5) * scale,
          clientY: rect.top + (y + 0.5) * scale,
        })
      );
    },
    { x, y }
  );
}

export async function clickZoomControl(page, title) {
  await page.locator(`.zoom-controls button[title="${title}"]`).click();
}

/**
 * Loads a fixture, applies the given settings and waits for the canvas to match.
 * Prefer `length` over `bytes` for anything large, see loadGeneratedImage.
 */
export async function renderImage(page, {
  bytes,
  length,
  fileName = 'fixture.raw',
  format = 'grayscale',
  width,
  height,
  bitsPerPixel = 8,
  storage = 'Packed bitstream',
}) {
  await loadImage(page, { bytes, length, fileName });

  await selectBitDepth(page, bitsPerPixel);
  await selectStorageMode(page, storage);
  await controls(page).format.selectOption(format);
  await setResolution(page, width, height);

  await expect(controls(page).apply).toBeEnabled();
  await controls(page).apply.click();
  await expect(status(page).imageSize).toHaveText(`Image: ${width}×${height}`);
}

/** Client coordinates of the centre of the canvas, for wheel and drag gestures. */
export async function canvasCentre(page) {
  const box = await page.locator(CANVAS).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
