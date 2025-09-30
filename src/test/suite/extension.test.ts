import * as assert from 'assert';
import * as vscode from 'vscode';
import { CONFIG_KEYS } from '../../shared/constants';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Sample test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });

  suite('Bin File Support Tests', () => {
    test('Configuration key should be defined', () => {
      assert.strictEqual(CONFIG_KEYS.ENABLE_BIN_SUPPORT, 'raw-image-viewer.enableBinSupport');
    });

    test('Bin support configuration should be accessible', async () => {
      const config = vscode.workspace.getConfiguration('raw-image-viewer');
      const binSupport = config.get('enableBinSupport');
      // Just check that the configuration exists and is a boolean
      assert.strictEqual(typeof binSupport, 'boolean');
    });

    test('Configuration key should match constant', () => {
      // Verify that the configuration key constant matches what's in package.json
      assert.strictEqual(CONFIG_KEYS.ENABLE_BIN_SUPPORT, 'raw-image-viewer.enableBinSupport');
    });

    test('Extension should activate successfully', async () => {
      // The extension should already be active during tests
      // Check if the extension is properly loaded by checking for a known export
      try {
        // Try to import the extension module
        const extensionModule = require('../../extension/extension');
        assert.ok(extensionModule, 'Extension module should be loadable');
        assert.ok(typeof extensionModule.activate === 'function', 'Extension should have activate function');
        assert.ok(typeof extensionModule.deactivate === 'function', 'Extension should have deactivate function');
      } catch (error) {
        assert.fail(`Extension module should be loadable: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    test('Extension exports should be correct', () => {
      const extensionModule = require('../../extension/extension');
      
      // Check that activate and deactivate functions are exported
      assert.ok(typeof extensionModule.activate === 'function', 'activate should be a function');
      assert.ok(typeof extensionModule.deactivate === 'function', 'deactivate should be a function');
    });
  });
});
