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
  await page.evaluate(
    ({ sample, generatedLength, fileName, locale }) => {
      const value = sample ?? Array.from({ length: generatedLength }, (_, index) => index & 0xff);
      window.postMessage({ type: 'init', body: { value, editable: false, locale, fileName } }, '*');
    },
    {
      sample: bytes ? Array.from(bytes) : null,
      generatedLength: length ?? 0,
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

export function controls(page) {
  return {
    width: page.locator('.controls-panel input[type=number]').first(),
    height: page.locator('.controls-panel input[type=number]').nth(1),
    format: page.locator('.controls-panel select'),
    apply: page.locator('button.apply-button'),
    storageModes: page.locator('.storage-btn'),
    bitDepths: page.locator('.bits-btn'),
    zoom: page.locator('.zoom-controls span'),
  };
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
