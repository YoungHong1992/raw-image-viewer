import * as vscode from 'vscode';
import { Disposable, disposeAll } from './dispose';
import { getNonce } from './util';

interface RawImageDocumentDelegate {
    getFileData(): Promise<Uint8Array>;
}

class RawImageDocument extends Disposable implements vscode.CustomDocument {
    static async create(
        uri: vscode.Uri,
        backupId: string | undefined,
        delegate: RawImageDocumentDelegate,
    ): Promise<RawImageDocument> {
        const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
        const fileData = await RawImageDocument.readFile(dataFile);
        return new RawImageDocument(uri, fileData, delegate);
    }

    private static async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        if (uri.scheme === 'untitled') {
            return new Uint8Array();
        }
        return new Uint8Array(await vscode.workspace.fs.readFile(uri));
    }

    private readonly _uri: vscode.Uri;
    private _documentData: Uint8Array;
    private readonly _delegate: RawImageDocumentDelegate;

    private constructor(
        uri: vscode.Uri,
        initialContent: Uint8Array,
        delegate: RawImageDocumentDelegate
    ) {
        super();
        this._uri = uri;
        this._documentData = initialContent;
        this._delegate = delegate;
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

    async save(cancellation: vscode.CancellationToken): Promise<void> {
        await this.saveAs(this.uri, cancellation);
    }

    async saveAs(targetResource: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
        const fileData = await this._delegate.getFileData();
        if (cancellation.isCancellationRequested) {
            return;
        }
        await vscode.workspace.fs.writeFile(targetResource, fileData);
    }

    async revert(_cancellation: vscode.CancellationToken): Promise<void> {
        const diskContent = await RawImageDocument.readFile(this.uri);
        this._documentData = diskContent;
        this._onDidChangeDocument.fire({
            content: diskContent,
        });
    }

    async backup(destination: vscode.Uri, cancellation: vscode.CancellationToken): Promise<vscode.CustomDocumentBackup> {
        await this.saveAs(destination, cancellation);

        return {
            id: destination.toString(),
            delete: async () => {
                try {
                    await vscode.workspace.fs.delete(destination);
                } catch {
                    // noop
                }
            }
        };
    }
}

export class RawImageViewerProvider implements vscode.CustomEditorProvider<RawImageDocument> {
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

    private static readonly viewType = 'raw-image-viewer.rawImage';
    private readonly webviews = new Map<string, vscode.WebviewPanel>();

    constructor(
        private readonly _context: vscode.ExtensionContext
    ) { }

    async openCustomDocument(
        uri: vscode.Uri,
        openContext: { backupId?: string },
        _token: vscode.CancellationToken
    ): Promise<RawImageDocument> {
        const document = await RawImageDocument.create(uri, openContext.backupId, {
            getFileData: async () => {
                const webview = this.webviews.get(document.uri.toString());
                if (!webview) {
                    throw new Error('Could not find webview to save for');
                }
                const response = await this.postMessageWithResponse<number[]>(webview, 'getFileData', {});
                return new Uint8Array(response);
            }
        });

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

    private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<RawImageDocument>>();
    public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

    public saveCustomDocument(document: RawImageDocument, cancellation: vscode.CancellationToken): Thenable<void> {
        return document.save(cancellation);
    }

    public saveCustomDocumentAs(document: RawImageDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
        return document.saveAs(destination, cancellation);
    }

    public revertCustomDocument(document: RawImageDocument, cancellation: vscode.CancellationToken): Thenable<void> {
        return document.revert(cancellation);
    }

    public backupCustomDocument(document: RawImageDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
        return document.backup(context.destination, cancellation);
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
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleResetUri}" rel="stylesheet" />
                <link href="${styleVSCodeUri}" rel="stylesheet" />
                <link href="${styleMainUri}" rel="stylesheet" />
                <title>Raw Image Viewer</title>
            </head>
            <body>
                <div class="raw-image-container">
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