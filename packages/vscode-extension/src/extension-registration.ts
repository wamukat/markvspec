import * as vscode from "vscode";

export interface RegisterMarkVSpecExtensionOptions {
  context: vscode.ExtensionContext;
  diagnosticsCollection: vscode.DiagnosticCollection;
  outputChannel: vscode.OutputChannel;
  createDocumentSymbolsProvider(): vscode.DocumentSymbolProvider;
  createCodeActionsProvider(): vscode.CodeActionProvider;
  formatStructure(): Promise<void> | void;
  openPreview(resource?: vscode.Uri): Promise<void> | void;
  refreshPreview(): Promise<void> | void;
  onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent): void;
  onDidChangeTextEditorSelection(event: vscode.TextEditorSelectionChangeEvent): void;
  onDidChangeActiveTextEditor(editor: vscode.TextEditor | undefined): void;
  onDidOpenTextDocument(document: vscode.TextDocument): void;
  onDidSaveTextDocument(document: vscode.TextDocument): void;
  onDidCloseTextDocument(document: vscode.TextDocument): void;
  onMessageFileChange(): void;
  exportCommandDisposables: vscode.Disposable[];
}

export function registerMarkVSpecExtension(options: RegisterMarkVSpecExtensionOptions): void {
  const documentSymbols = vscode.languages.registerDocumentSymbolProvider(
    { language: "markvspec", scheme: "file" },
    options.createDocumentSymbolsProvider()
  );
  const codeActions = vscode.languages.registerCodeActionsProvider(
    { language: "markvspec", scheme: "file" },
    options.createCodeActionsProvider(),
    {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
    }
  );
  const formatStructure = vscode.commands.registerCommand("markvspec.formatStructure", options.formatStructure);
  const openPreview = vscode.commands.registerCommand("markvspec.openPreview", options.openPreview);
  const refreshPreview = vscode.commands.registerCommand("markvspec.refreshPreview", options.refreshPreview);
  const liveUpdate = vscode.workspace.onDidChangeTextDocument(options.onDidChangeTextDocument);
  const selectionUpdate = vscode.window.onDidChangeTextEditorSelection(options.onDidChangeTextEditorSelection);
  const activeEditorUpdate = vscode.window.onDidChangeActiveTextEditor(options.onDidChangeActiveTextEditor);
  const openUpdate = vscode.workspace.onDidOpenTextDocument(options.onDidOpenTextDocument);
  const saveUpdate = vscode.workspace.onDidSaveTextDocument(options.onDidSaveTextDocument);
  const closeUpdate = vscode.workspace.onDidCloseTextDocument(options.onDidCloseTextDocument);
  const messageFileUpdate = vscode.workspace.createFileSystemWatcher("**/*.{yml,yaml,json}");
  messageFileUpdate.onDidCreate(options.onMessageFileChange, undefined, options.context.subscriptions);
  messageFileUpdate.onDidChange(options.onMessageFileChange, undefined, options.context.subscriptions);
  messageFileUpdate.onDidDelete(options.onMessageFileChange, undefined, options.context.subscriptions);

  options.context.subscriptions.push(
    formatStructure,
    ...options.exportCommandDisposables,
    codeActions,
    documentSymbols,
    openPreview,
    refreshPreview,
    liveUpdate,
    selectionUpdate,
    activeEditorUpdate,
    openUpdate,
    saveUpdate,
    closeUpdate,
    messageFileUpdate,
    options.diagnosticsCollection,
    options.outputChannel
  );
}
