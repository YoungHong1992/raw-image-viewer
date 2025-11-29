import * as vscode from 'vscode';
import { RawImageDocument } from './document';
import { CONFIG_KEYS, VIEW_TYPE_BIN } from '../shared/constants';
import { WebviewMessage, InitMessage, ResponseMessage } from '../shared/types';

/**
 * RAW图像查看器提供者
 */
export class RawImageViewerProvider implements vscode.CustomReadonlyEditorProvider<RawImageDocument> {
  private readonly _viewType: string;

  constructor(private readonly _context: vscode.ExtensionContext, viewType: string) {
    this._viewType = viewType;
  }

  public static register(context: vscode.ExtensionContext, viewType: string): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      viewType,
      new RawImageViewerProvider(context, viewType),
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  private readonly webviewPanelMap = new Map<string, vscode.WebviewPanel>();
  private readonly _callbacks = new Map<number, (response: any) => void>();

  async openCustomDocument(
    uri: vscode.Uri,
    openContext: { backupId?: string },
    _token: vscode.CancellationToken
  ): Promise<RawImageDocument> {
    // Check if bin support is disabled for .bin files
    if (this._viewType === VIEW_TYPE_BIN) {
      const config = vscode.workspace.getConfiguration();
      const enableBinSupport = config.get(CONFIG_KEYS.ENABLE_BIN_SUPPORT, true);
      if (!enableBinSupport) {
        // Throw an error to make VS Code fall back to the next available editor
        throw new Error('Bin file support is disabled');
      }
    }
    
    const document = await RawImageDocument.create(uri);
    return document;
  }

  async resolveCustomEditor(
    document: RawImageDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    this.webviewPanelMap.set(document.uri.toString(), webviewPanel);

    const mediaBuildPath = vscode.Uri.joinPath(this._context.extensionUri, 'dist', 'webview');

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [mediaBuildPath]
    };
    
    webviewPanel.webview.html = await this.getHtmlForWebview(webviewPanel.webview);
    webviewPanel.webview.onDidReceiveMessage(e => this.onMessage(document, webviewPanel, e));

    // 清理资源
    webviewPanel.onDidDispose(() => {
      this.webviewPanelMap.delete(document.uri.toString());
    });
  }

  private async getHtmlForWebview(webview: vscode.Webview): Promise<string> {
    const extensionUri = this._context.extensionUri;
    const webviewBuildPath = vscode.Uri.joinPath(extensionUri, 'dist', 'webview');
    const baseUri = webview.asWebviewUri(webviewBuildPath);
    const indexPath = vscode.Uri.joinPath(webviewBuildPath, 'index.html');

    let htmlContent: string;
    try {
      const indexFileContentBytes = await vscode.workspace.fs.readFile(indexPath);
      htmlContent = new TextDecoder().decode(indexFileContentBytes);
    } catch (e) {
      console.error(`Error reading webview index.html: ${indexPath.fsPath}`, e);
      return `<html><body>Error loading extension. Webview build output not found at ${indexPath.fsPath}. Please ensure the UI is built.</body></html>`;
    }

    // 设置正确的base标签
    const baseTag = `<base href="${baseUri}/">`;
    if (htmlContent.includes('<base href')) {
      htmlContent = htmlContent.replace(/<base href=".*?"\/?>/, baseTag);
    } else {
      htmlContent = htmlContent.replace('<head>', `<head>\n    ${baseTag}`);
    }

    return htmlContent;
  }

  private postMessage(panel: vscode.WebviewPanel, type: string, body: any): void {
    panel.webview.postMessage({ type, body } as WebviewMessage);
  }

  private onMessage(document: RawImageDocument, panel: vscode.WebviewPanel, message: WebviewMessage) {
    switch (message.type) {
      case 'ready':
        this.postMessage(panel, 'init', {
          value: document.documentData,
          editable: false
        });
        return;
        
      case 'response': {
        const responseMsg = message as ResponseMessage;
        const callback = this._callbacks.get(responseMsg.requestId);
        callback?.(responseMsg.body);
        return;
      }
    }
  }
}