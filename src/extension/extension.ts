import * as vscode from 'vscode';
import { RawImageViewerProvider } from './provider';
import { CONFIG_KEYS, VIEW_TYPE_RAW, VIEW_TYPE_BIN } from '../shared/constants';

/**
 * 扩展激活函数
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Raw Image Viewer extension is now active!');

  // Always register the provider for .raw files
  context.subscriptions.push(RawImageViewerProvider.register(context, VIEW_TYPE_RAW));

  // Always register the provider for .bin files
  // The provider will check the config internally and reject if disabled
  context.subscriptions.push(RawImageViewerProvider.register(context, VIEW_TYPE_BIN));

  // 注册"使用Raw Image Viewer打开"命令
  const openWithRawViewerCommand = vscode.commands.registerCommand('raw-image-viewer.openWithRawViewer', async (uri: vscode.Uri) => {
    if (!uri) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        uri = activeEditor.document.uri;
      }
    }

    if (uri) {
      const viewType = uri.fsPath.toLowerCase().endsWith('.bin') ? VIEW_TYPE_BIN : VIEW_TYPE_RAW;
      await vscode.commands.executeCommand('vscode.openWith', uri, viewType);
    } else {
      vscode.window.showErrorMessage('No file selected to open with Raw Image Viewer');
    }
  });

  // 监听配置变化, 提示用户重载
  const configChangeListener = vscode.workspace.onDidChangeConfiguration(async e => {
    if (e.affectsConfiguration(CONFIG_KEYS.ENABLE_BIN_SUPPORT)) {
      const result = await vscode.window.showInformationMessage(
        'Raw Image Viewer: Configuration for .bin file support has changed. Please reload the window for the change to take effect.',
        'Reload Window'
      );
      if (result === 'Reload Window') {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    }
  });

  // 注册Hello World命令（保持向后兼容）
  const helloWorldCommand = vscode.commands.registerCommand('raw-image-viewer.helloWorld', () => {
    vscode.window.showInformationMessage('Hello World from RawImageViewer!');
  });

  context.subscriptions.push(helloWorldCommand, openWithRawViewerCommand, configChangeListener);
}

/**
 * 扩展停用函数
 */
export function deactivate() {
  // All disposables are now managed by context.subscriptions
}