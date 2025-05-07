import * as vscode from 'vscode';
import { Disposable, disposeAll } from './dispose';
import { getNonce } from './util';

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

    private readonly webviews = new Map<string, vscode.WebviewPanel>();

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
        this.webviews.set(document.uri.toString(), webviewPanel);

        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        webviewPanel.webview.onDidReceiveMessage(e => this.onMessage(document, e));

        webviewPanel.webview.onDidReceiveMessage(e => {
            if (e.type === 'ready') {
                this.postMessage(webviewPanel, 'init', {
                    value: document.documentData,
                    editable: false
                });
            }
        });
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._context.extensionUri, 'media', 'rawImage.js'));

        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._context.extensionUri, 'media', 'reset.css'));

        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._context.extensionUri, 'media', 'vscode.css'));

        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._context.extensionUri, 'media', 'rawImage.css'));

        const nonce = getNonce();

        return /* html */`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleResetUri}" rel="stylesheet" />
                <link href="${styleVSCodeUri}" rel="stylesheet" />
                <link href="${styleMainUri}" rel="stylesheet" />
                <title>Raw Image Viewer</title>
            </head>
            <body>
                <div class="raw-image-container">
                    <div class="image-params-form">
                        <div class="form-group">
                            <label for="image-width">宽度:</label>
                            <input type="number" id="image-width" value="2688" min="1" />
                        </div>
                        <div class="form-group">
                            <label for="image-height">高度:</label>
                            <input type="number" id="image-height" value="1520" min="1" />
                        </div>
                        <div class="form-group">
                            <label for="bits-per-pixel">每像素位数:</label>
                            <input type="number" id="bits-per-pixel" value="10" min="1" max="16" />
                        </div>
                        <button id="apply-params-btn">应用参数</button>
                    </div>
                    <canvas class="raw-image-canvas"></canvas>
                </div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    private _requestId = 1;
    private readonly _callbacks = new Map<number, (response: any) => void>();

    private postMessageWithResponse<R = unknown>(panel: vscode.WebviewPanel, type: string, body: any): Promise<R> {
        const requestId = this._requestId++;
        const p = new Promise<R>(resolve => this._callbacks.set(requestId, resolve));
        panel.webview.postMessage({ type, requestId, body });
        return p;
    }

    private postMessage(panel: vscode.WebviewPanel, type: string, body: any): void {
        panel.webview.postMessage({ type, body });
    }

    private onMessage(document: RawImageDocument, message: any) {
        switch (message.type) {
            case 'response': {
                const callback = this._callbacks.get(message.requestId);
                callback?.(message.body);
                return;
            }
        }
    }
}