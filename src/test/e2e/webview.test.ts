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

describe('Raw Image Viewer custom editor', function () {
  this.timeout(120_000);

  let webview: WebView;

  before(async () => {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true });
    const data = Buffer.alloc(IMAGE_WIDTH * IMAGE_HEIGHT);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = index & 0xff;
    }
    fs.writeFileSync(FIXTURE_FILE, data);

    const editorView = new EditorView();
    await VSBrowser.instance.openResources(FIXTURE_FILE);
    await waitFor(async () => {
      const titles = await editorView.getOpenEditorTitles();
      return titles.some((title) => title.includes(FIXTURE_NAME)) ? titles : undefined;
    });

    webview = new WebView();
    await webview.switchToFrame(30_000);
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

    const activeStorage = await waitFor(async () => {
      const buttons = await webview.findWebElements(By.css('.storage-btn.active'));
      return buttons.length === 1 ? (await buttons[0].getText()).trim() : undefined;
    });

    assert.equal(activeStorage, '16-bit container');
  });

  it('tracks the hovered pixel through the real webview', async () => {
    const canvas: WebElement = await webview.findWebElement(By.css('canvas.raw-image-canvas'));
    await VSBrowser.instance.driver.actions().move({ origin: canvas }).perform();

    assert.match(await pollText(webview, '#pixel-info'), /^Pixel: \(\d+, \d+, \d+\)$/);
    assert.match(await pollText(webview, '#cursor-pos'), /^Cursor: \(\d+, \d+\)$/);
  });
});
