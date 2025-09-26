import * as vscode from 'vscode';
import { RawImageViewerProvider } from './provider';
import { CONFIG_KEYS } from '../shared/constants';

/**
 * 扩展激活函数
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Raw Image Viewer extension is now active!');

  // 注册Hello World命令（保持向后兼容）
  const helloWorldCommand = vscode.commands.registerCommand('raw-image-viewer.helloWorld', () => {
    vscode.window.showInformationMessage('Hello World from RawImageViewer!');
  });

  // 注册"使用Raw Image Viewer打开"命令
  const openWithRawViewerCommand = vscode.commands.registerCommand('raw-image-viewer.openWithRawViewer', async (uri: vscode.Uri) => {
    if (!uri) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        uri = activeEditor.document.uri;
      }
    }

    if (uri) {
      await vscode.commands.executeCommand('vscode.openWith', uri, 'raw-image-viewer.rawImage');
    } else {
      vscode.window.showErrorMessage('No file selected to open with Raw Image Viewer');
    }
  });

  // 注册自定义编辑器提供者
  const editorProvider = RawImageViewerProvider.register(context);

  // 监听配置变化
  const configChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration(CONFIG_KEYS.ENABLE_BIN_SUPPORT)) {
      console.log('Raw Image Viewer: bin support configuration changed');
    }
  });

  context.subscriptions.push(helloWorldCommand, openWithRawViewerCommand, editorProvider, configChangeListener);
}

/**
 * 扩展停用函数
 */
export function deactivate() {
  // 清理资源
}