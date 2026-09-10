import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { RawImageViewerProvider } from '../../extension/provider';
import { CONFIG_KEYS, VIEW_TYPE_BIN, VIEW_TYPE_RAW } from '../../shared/constants';

const EXTENSION_ID = 'YoungHong1992.raw-image-viewer';

const RAMP_BYTES = Buffer.from(Array.from({ length: 256 }, (_unused, index) => index));

/** The extension context is only needed to resolve webview URIs, which these tests never reach. */
function providerFor(viewType: string): RawImageViewerProvider {
  return new RawImageViewerProvider(
    { extensionUri: vscode.extensions.getExtension(EXTENSION_ID)!.extensionUri } as vscode.ExtensionContext,
    viewType
  );
}

const NEVER_CANCELLED = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => undefined }),
} as unknown as vscode.CancellationToken;

function activeTabViewType(): string | undefined {
  const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  return input instanceof vscode.TabInputCustom ? input.viewType : undefined;
}

/** Waits until the workbench has a custom editor tab for this uri, then returns it. */
async function waitForCustomEditor(uri: vscode.Uri, viewType: string, timeout = 15000): Promise<vscode.Tab> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const match = vscode.window.tabGroups.all
      .flatMap(group => group.tabs)
      .find(
        tab =>
          tab.input instanceof vscode.TabInputCustom &&
          tab.input.viewType === viewType &&
          tab.input.uri.toString() === uri.toString()
      );
    if (match) {
      return match;
    }
    if (Date.now() >= deadline) {
      throw new Error(`No ${viewType} tab for ${path.basename(uri.fsPath)} within ${timeout}ms`);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/** Editors keep file handles open briefly, so Windows needs retries while deleting fixtures. */
function removeDirectory(directory: string): void {
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}

/** `undefined` restores the packaged default instead of pinning a value in the test profile. */
function setBinSupport(value: boolean | undefined): Thenable<void> {
  return vscode.workspace
    .getConfiguration()
    .update(CONFIG_KEYS.ENABLE_BIN_SUPPORT, value, vscode.ConfigurationTarget.Global);
}

suite('Configuration', () => {
  test('exposes the .bin support setting with a boolean default', () => {
    assert.strictEqual(CONFIG_KEYS.ENABLE_BIN_SUPPORT, 'raw-image-viewer.enableBinSupport');

    const value = vscode.workspace.getConfiguration('raw-image-viewer').get('enableBinSupport');
    assert.strictEqual(typeof value, 'boolean');
  });
});

suite('Extension activation', () => {
  test('activates and registers the raw viewer commands', async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `${EXTENSION_ID} should be installed`);

    await extension.activate();
    assert.strictEqual(extension.isActive, true);

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('raw-image-viewer.openWithRawViewer'), 'open command should be registered');
    assert.ok(commands.includes('raw-image-viewer.helloWorld'), 'hello world command should be registered');
  });
});

suite('Custom editor documents', () => {
  let directory: string;
  let rawUri: vscode.Uri;
  let binUri: vscode.Uri;

  suiteSetup(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'raw-image-viewer-'));
    rawUri = vscode.Uri.file(path.join(directory, 'ramp_16x16_8bit_gray.raw'));
    binUri = vscode.Uri.file(path.join(directory, 'ramp_16x16_8bit_gray.bin'));
    await vscode.workspace.fs.writeFile(rawUri, RAMP_BYTES);
    await vscode.workspace.fs.writeFile(binUri, RAMP_BYTES);
  });

  // The .bin gate is global state, so every test starts from the shipped default.
  setup(() => setBinSupport(undefined));

  suiteTeardown(async () => {
    removeDirectory(directory);
    await setBinSupport(undefined);
  });

  test('reads the whole .raw file into the document', async () => {
    const document = await providerFor(VIEW_TYPE_RAW).openCustomDocument(rawUri, {}, NEVER_CANCELLED);

    assert.strictEqual(document.uri.toString(), rawUri.toString());
    assert.deepStrictEqual(Buffer.from(document.documentData), RAMP_BYTES);
  });

  test('reads .bin files while bin support is enabled', async () => {
    await setBinSupport(true);

    const document = await providerFor(VIEW_TYPE_BIN).openCustomDocument(binUri, {}, NEVER_CANCELLED);

    assert.deepStrictEqual(Buffer.from(document.documentData), RAMP_BYTES);
  });

  test('rejects .bin files while bin support is disabled', async () => {
    await setBinSupport(false);

    await assert.rejects(
      () => providerFor(VIEW_TYPE_BIN).openCustomDocument(binUri, {}, NEVER_CANCELLED),
      /disabled/
    );

    // Only the .bin view type is gated; .raw files keep working.
    const document = await providerFor(VIEW_TYPE_RAW).openCustomDocument(rawUri, {}, NEVER_CANCELLED);
    assert.deepStrictEqual(Buffer.from(document.documentData), RAMP_BYTES);
  });
});

suite('Opening files with the raw viewer', () => {
  let directory: string;
  let rawUri: vscode.Uri;
  let binUri: vscode.Uri;

  suiteSetup(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'raw-image-viewer-open-'));
    rawUri = vscode.Uri.file(path.join(directory, 'sensor_16x16_8bit_gray.raw'));
    binUri = vscode.Uri.file(path.join(directory, 'sensor_16x16_8bit_gray.bin'));
    await vscode.workspace.fs.writeFile(rawUri, RAMP_BYTES);
    await vscode.workspace.fs.writeFile(binUri, RAMP_BYTES);
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    removeDirectory(directory);
  });

  test('opens a .raw file in the raw custom editor', async () => {
    await vscode.commands.executeCommand('raw-image-viewer.openWithRawViewer', rawUri);
    await waitForCustomEditor(rawUri, VIEW_TYPE_RAW);

    assert.strictEqual(activeTabViewType(), VIEW_TYPE_RAW);
  });

  test('routes .bin files to the bin custom editor', async () => {
    await vscode.commands.executeCommand('raw-image-viewer.openWithRawViewer', binUri);
    await waitForCustomEditor(binUri, VIEW_TYPE_BIN);

    assert.strictEqual(activeTabViewType(), VIEW_TYPE_BIN);
  });
});
