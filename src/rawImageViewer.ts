import * as vscode from 'vscode';
import { Disposable, disposeAll } from './dispose';

class RawImageDocument extends Disposable implements vscode.CustomDocument {
    private readonly _uri: vscode.Uri;
    private _documentData: Uint8Array;

    private constructor(
        uri: vscode.Uri,
        initialContent: Uint8Array
    ) {
        super();
        this._uri = uri;
        this._documentData = initialContent;
    }

    static async create(
        uri: vscode.Uri
    ): Promise<RawImageDocument> {
        const fileData = await RawImageDocument.readFile(uri);
        return new RawImageDocument(uri, fileData);
    }

    private static async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        if (uri.scheme === 'untitled') {
            return new Uint8Array();
        }
        return new Uint8Array(await vscode.workspace.fs.readFile(uri));
    }


    public get uri() { return this._uri; }
    public get documentData(): Uint8Array { return this._documentData; }

    private readonly _onDidDispose = this._register(new vscode.EventEmitter<void>());
    public readonly onDidDispose = this._onDidDispose.event;

    private readonly _onDidChangeDocument = this._register(new vscode.EventEmitter<{
        readonly content?: Uint8Array;
    }>());
    public readonly onDidChangeContent = this._onDidChangeDocument.event;

    dispose(): void {
        this._onDidDispose.fire();
        super.dispose();
    }
}

export class RawImageViewerProvider implements vscode.CustomReadonlyEditorProvider<RawImageDocument> {
    private static readonly viewType = 'raw-image-viewer.rawImage';
    constructor(private readonly _context: vscode.ExtensionContext) { }

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.window.registerCustomEditorProvider(
            RawImageViewerProvider.viewType,
            new RawImageViewerProvider(context),
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
                supportsMultipleEditorsPerDocument: false,
            });
    }

    private readonly webviewPanelMap = new Map<string, vscode.WebviewPanel>();

    async openCustomDocument(
        uri: vscode.Uri,
        openContext: { backupId?: string },
        _token: vscode.CancellationToken
    ): Promise<RawImageDocument> {
        const document = await RawImageDocument.create(uri);
        return document;
    }

    async resolveCustomEditor(
        document: RawImageDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        this.webviewPanelMap.set(document.uri.toString(), webviewPanel);

        const mediaBuildPath = vscode.Uri.joinPath(this._context.extensionUri, 'dist', 'media');

        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [mediaBuildPath]
        };
        webviewPanel.webview.html = await this.getHtmlForWebview(webviewPanel.webview);

        webviewPanel.webview.onDidReceiveMessage(e => this.onMessage(document, webviewPanel, e));

        // Clean up resources when the panel is disposed
        webviewPanel.onDidDispose(() => {
            this.webviewPanelMap.delete(document.uri.toString());
        });
    }

    private async getHtmlForWebview(webview: vscode.Webview): Promise<string> {
        const extensionUri = this._context.extensionUri;

        const mediaBuildPath = vscode.Uri.joinPath(extensionUri, 'dist', 'media');
        const baseUri = webview.asWebviewUri(mediaBuildPath);

        const indexPath = vscode.Uri.joinPath(mediaBuildPath, 'index.html');

        let htmlContent: string;
        try {
            const indexFileContentBytes = await vscode.workspace.fs.readFile(indexPath);
            htmlContent = new TextDecoder().decode(indexFileContentBytes);
        } catch (e) {
            console.error(`Error reading Vite's index.html: ${indexPath.fsPath}`, e);
            return `<html><body>Error loading extension. Vite build output not found at ${indexPath.fsPath}. Please ensure the UI is built (e.g., 'npm run build' in the media folder).</body></html>`;
        }


        // Ensure the <base> tag is correctly set for webview resource loading
        const baseTag = `<base href="${baseUri}/">`;
        if (htmlContent.includes('<base href')) {
            htmlContent = htmlContent.replace(/<base href=".*?"\/?>/, baseTag);
        } else {
            htmlContent = htmlContent.replace('<head>', `<head>\n    ${baseTag}`);
        }

        return htmlContent;
    }

    private readonly _callbacks = new Map<number, (response: any) => void>();

    private postMessage(panel: vscode.WebviewPanel, type: string, body: any): void {
        panel.webview.postMessage({ type, body });
    }

    private onMessage(document: RawImageDocument, panel: vscode.WebviewPanel, message: any) {
        switch (message.type) {
            case 'ready':
                this.postMessage(panel, 'init', {
                    value: document.documentData,
                    editable: false
                });
                return;
            case 'response': {
                const callback = this._callbacks.get(message.requestId);
                callback?.(message.body);
                return;
            }
        }
    }
}