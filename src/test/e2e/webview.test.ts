import { strict as assert } from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { By, EditorView, VSBrowser, WebView, type WebElement } from 'vscode-extension-tester';

const IMAGE_WIDTH = 640;
const IMAGE_HEIGHT = 480;
const FIXTURE_NAME = 'sensor_640x480_8bit_gray.raw';
const FIXTURE_DIR = path.resolve(__dirname, '..', '..', '..', 'test-fixtures');
const FIXTURE_FILE = path.join(FIXTURE_DIR, FIXTURE_NAME);

const FORMATS = ['grayscale', 'rgb', 'rggb', 'grbg', 'gbrg', 'bggr'];

async function waitFor<T>(probe: () => Promise<T | undefined>, timeout = 30_000, interval = 500): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    let result: T | undefined;
    try {
      result = await probe();
    } catch {
      result = undefined;
    }
    if (result !== undefined) {
      return result;
    }
    if (Date.now() >= deadline) {
      throw new Error(`Condition was not met within ${timeout}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/** The webview mounts asynchronously, so text has to be polled until it settles. */
function pollText(webview: WebView, css: string, timeout = 30_000): Promise<string> {
  return waitFor(async () => {
    const elements = await webview.findWebElements(By.css(css));
    if (elements.length !== 1) {
      return undefined;
    }
    const text = (await elements[0].getText()).trim();
    return text.length > 0 ? text : undefined;
  }, timeout);
}

function pollEnabled(webview: WebView, css: string, expected: boolean, timeout = 30_000): Promise<boolean> {
  return waitFor(async () => {
    const elements = await webview.findWebElements(By.css(css));
    if (elements.length !== 1) {
      return undefined;
    }
    const enabled = await elements[0].isEnabled();
    return enabled === expected ? enabled : undefined;
  }, timeout);
}

/** Locates a button by its visible label, mirroring the Playwright suite's selectors. */
function byLabel(className: string, label: string) {
  return By.xpath(`//button[contains(@class, '${className}') and normalize-space(text())='${label}']`);
}

/** The zoom controls are localized, so they are addressed by position: -, label, +, 1:1, Fit. */
const ZOOM_OUT = 1;
const ZOOM_IN = 2;
const ZOOM_RESET = 3;
const ZOOM_FIT = 4;

function zoomButton(position: number) {
  return By.css(`.zoom-controls button:nth-of-type(${position})`);
}

async function click(webview: WebView, by: By) {
  const element = await waitFor(async () => (await webview.findWebElements(by))[0]);
  await element.click();
}

/** Reading the label has to wait for the Vue update triggered by the click. */
async function zoomLabel(webview: WebView): Promise<string> {
  return pollText(webview, '.zoom-controls span');
}

/** Reads the label of the single active button inside a toggle group. */
async function activeButton(webview: WebView, css: string): Promise<string> {
  return waitFor(async () => {
    const buttons = await webview.findWebElements(By.css(css));
    return buttons.length === 1 ? (await buttons[0].getText()).trim() : undefined;
  });
}

async function openFixture(file: string): Promise<WebView> {
  const editorView = new EditorView();
  await VSBrowser.instance.openResources(file);
  const name = path.basename(file);
  await waitFor(async () => {
    const titles = await editorView.getOpenEditorTitles();
    return titles.some((title) => title.includes(name)) ? titles : undefined;
  });

  const webview = new WebView();
  await webview.switchToFrame(30_000);
  return webview;
}

function writeRampFixture(file: string, width: number, height: number): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const data = Buffer.alloc(width * height);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = index & 0xff;
  }
  fs.writeFileSync(file, data);
}

describe('Raw Image Viewer custom editor', function () {
  this.timeout(120_000);

  let webview: WebView;

  before(async () => {
    writeRampFixture(FIXTURE_FILE, IMAGE_WIDTH, IMAGE_HEIGHT);
    webview = await openFixture(FIXTURE_FILE);
  });

  after(async () => {
    await webview?.switchBack();
    await new EditorView().closeAllEditors();
    fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  it('renders the resolution and file size inferred from the file name', async () => {
    assert.equal(await pollText(webview, '#image-size'), 'Image: 640×480');
    assert.equal(await pollText(webview, '#file-info'), 'File: 300 KB');
  });

  it('sizes the canvas to the decoded image', async () => {
    const canvas = await webview.findWebElement(By.css('canvas.raw-image-canvas'));
    await waitFor(async () => ((await canvas.getAttribute('width')) === '640' ? true : undefined));

    assert.equal(await canvas.getAttribute('width'), String(IMAGE_WIDTH));
    assert.equal(await canvas.getAttribute('height'), String(IMAGE_HEIGHT));
  });

  it('offers every supported pixel format', async () => {
    const options = await webview.findWebElements(By.css('.controls-panel select option'));
    const values = await Promise.all(options.map((option) => option.getAttribute('value')));

    assert.deepEqual(values, FORMATS);
  });

  it('disables Apply while the settings cannot fit the file size', async () => {
    assert.equal(await pollEnabled(webview, 'button.apply-button', true), true);

    const width = await webview.findWebElement(By.css('.controls-panel input[type=number]'));
    await width.clear();
    await width.sendKeys('200000');

    assert.equal(await pollEnabled(webview, 'button.apply-button', false), false);
  });

  it('follows the bit depth with a compatible storage layout', async () => {
    const sixteenBits = await webview.findWebElement(byLabel('bits-btn', '16'));
    await sixteenBits.click();

    assert.equal(await activeButton(webview, '.bits-btn.active'), '16');
    assert.equal(await activeButton(webview, '.storage-btn.active'), '16-bit container');
  });

  it('tracks the hovered pixel through the real webview', async () => {
    const canvas: WebElement = await webview.findWebElement(By.css('canvas.raw-image-canvas'));
    await VSBrowser.instance.driver.actions().move({ origin: canvas }).perform();

    assert.match(await pollText(webview, '#pixel-info'), /^Pixel: \(\d+, \d+, \d+\)$/);
    assert.match(await pollText(webview, '#cursor-pos'), /^Cursor: \(\d+, \d+\)$/);
  });

  it('zooms through the control buttons and scales the canvas accordingly', async () => {
    await click(webview, zoomButton(ZOOM_RESET));
    assert.equal(await zoomLabel(webview), '100%');

    await click(webview, zoomButton(ZOOM_IN));
    assert.equal(await zoomLabel(webview), '150%');

    const canvas = await webview.findWebElement(By.css('canvas.raw-image-canvas'));
    assert.match(String(await canvas.getAttribute('style')), /scale\(1\.5\)/);

    for (let step = 0; step < 4; step += 1) {
      await click(webview, zoomButton(ZOOM_IN));
    }
    assert.equal(await zoomLabel(webview), '759%');

    await click(webview, zoomButton(ZOOM_OUT));
    assert.equal(await zoomLabel(webview), '570%');

    await click(webview, zoomButton(ZOOM_RESET));
    assert.equal(await zoomLabel(webview), '100%');
  });

  it('fits the rendered image even when the controls hold an unapplied resolution', async () => {
    const width = await webview.findWebElement(By.css('.controls-panel input[type=number]'));
    await width.clear();
    await width.sendKeys('200000');

    await click(webview, zoomButton(ZOOM_FIT));

    // Fit follows the 640x480 bitmap on screen, not the pending 200000-pixel width.
    const label = await zoomLabel(webview);
    assert.ok(Number.parseInt(label, 10) > 10, `Fit should keep a usable zoom level, got ${label}`);
  });
});

describe('Raw Image Viewer bin support', function () {
  this.timeout(120_000);

  const BIN_NAME = 'ramp_16x16_8bit_gray.bin';
  const BIN_FILE = path.join(FIXTURE_DIR, BIN_NAME);

  let webview: WebView;

  before(async () => {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true });
    fs.writeFileSync(BIN_FILE, Buffer.from(Array.from({ length: 256 }, (_unused, index) => index)));

    webview = await openFixture(BIN_FILE);
  });

  after(async () => {
    await webview?.switchBack();
    await new EditorView().closeAllEditors();
    fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  it('opens .bin files in the bin editor and infers the dimensions', async () => {
    assert.equal(await pollText(webview, '#image-size'), 'Image: 16×16');
    assert.equal(await pollText(webview, '#file-info'), 'File: 256 B');
  });
});

describe('Raw Image Viewer webview retention', function () {
  this.timeout(120_000);

  const DECOY_NAME = 'raw-viewer-decoy.txt';
  const DECOY_FILE = path.join(FIXTURE_DIR, DECOY_NAME);

  let webview: WebView;

  before(async () => {
    writeRampFixture(FIXTURE_FILE, IMAGE_WIDTH, IMAGE_HEIGHT);
    fs.writeFileSync(DECOY_FILE, 'plain text');

    webview = await openFixture(FIXTURE_FILE);
  });

  after(async () => {
    await webview?.switchBack();
    await new EditorView().closeAllEditors();
    fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  it('keeps the webview context when its tab is hidden and shown again', async () => {
    const remembered = '16';

    // Negative control: a freshly rendered webview follows the 8-bit file name hint.
    const freshlyRendered = await pollText(webview, '#image-size');
    assert.equal(freshlyRendered, 'Image: 640×480');
    assert.notEqual(await activeButton(webview, '.bits-btn.active'), remembered);

    // 16-bit samples no longer fit 640x480 bytes, so the pending state is observable in two places.
    await click(webview, byLabel('bits-btn', remembered));
    assert.equal(await activeButton(webview, '.bits-btn.active'), remembered);
    const pending = await waitFor(async () => {
      const text = await pollText(webview, '#image-size');
      return text === freshlyRendered ? undefined : text;
    });

    // Workbench page objects live outside the webview frame.
    await webview.switchBack();

    await VSBrowser.instance.openResources(DECOY_FILE);
    await waitFor(async () => {
      const titles = await new EditorView().getOpenEditorTitles();
      return titles.some((title) => title.includes(DECOY_NAME)) ? titles : undefined;
    });

    await new EditorView().openEditor(FIXTURE_NAME);
    webview = new WebView();
    await webview.switchToFrame(30_000);

    // retainContextWhenHidden keeps the unapplied settings instead of re-reading the file name hint.
    assert.equal(await pollText(webview, '#image-size'), pending);
    assert.equal(await activeButton(webview, '.bits-btn.active'), remembered);
  });
});
