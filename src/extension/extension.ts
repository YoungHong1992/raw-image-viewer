import * as vscode from 'vscode';
import { RawImageViewerProvider } from './provider';

/**
 * 扩展激活函数
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Raw Image Viewer extension is now active!');

  // 注册Hello World命令（保持向后兼容）
  const helloWorldCommand = vscode.commands.registerCommand('raw-image-viewer.helloWorld', () => {
    vscode.window.showInformationMessage('Hello World from RawImageViewer!');
  });

  // 注册自定义编辑器提供者
  const editorProvider = RawImageViewerProvider.register(context);

  context.subscriptions.push(helloWorldCommand, editorProvider);
}

/**
 * 扩展停用函数
 */
export function deactivate() {
  // 清理资源
}