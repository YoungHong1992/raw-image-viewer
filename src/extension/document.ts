import * as vscode from 'vscode';

/**
 * 可释放资源的基类
 */
export abstract class Disposable {
  private _isDisposed = false;

  protected _disposables: vscode.Disposable[] = [];

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._disposables.forEach(d => d.dispose());
  }

  protected _register<T extends vscode.Disposable>(value: T): T {
    if (this._isDisposed) {
      value.dispose();
    } else {
      this._disposables.push(value);
    }
    return value;
  }

  protected get isDisposed(): boolean {
    return this._isDisposed;
  }
}

/**
 * RAW图像文档模型
 */
export class RawImageDocument extends Disposable implements vscode.CustomDocument {
  private readonly _uri: vscode.Uri;
  private _documentData: Uint8Array;

  private constructor(uri: vscode.Uri, initialContent: Uint8Array) {
    super();
    this._uri = uri;
    this._documentData = initialContent;
  }

  static async create(uri: vscode.Uri): Promise<RawImageDocument> {
    const fileData = await RawImageDocument.readFile(uri);
    return new RawImageDocument(uri, fileData);
  }

  private static async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    if (uri.scheme === 'untitled') {
      return new Uint8Array();
    }
    return new Uint8Array(await vscode.workspace.fs.readFile(uri));
  }

  public get uri(): vscode.Uri { 
    return this._uri; 
  }
  
  public get documentData(): Uint8Array { 
    return this._documentData; 
  }

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