export async function resolve(specifier, context, nextResolve) {
  if (specifier === "vscode") {
    return {
      shortCircuit: true,
      url: "data:text/javascript," + encodeURIComponent(`
        export const __vscodeMock = {
          commands: new Map(),
          informationMessages: [],
          warningMessages: [],
          writtenFiles: [],
          createdDirectories: [],
          saveDialogCalls: [],
          shownDocuments: [],
          revealedRanges: [],
          activeTextEditor: undefined,
          saveDialogResult: undefined,
          openedDocuments: new Map(),
          reset() {
            this.commands.clear();
            this.informationMessages.length = 0;
            this.warningMessages.length = 0;
            this.writtenFiles.length = 0;
            this.createdDirectories.length = 0;
            this.saveDialogCalls.length = 0;
            this.shownDocuments.length = 0;
            this.revealedRanges.length = 0;
            this.activeTextEditor = undefined;
            this.saveDialogResult = undefined;
            this.openedDocuments.clear();
          }
        };
        function uriFromPath(path) {
          return {
            fsPath: path,
            path,
            toString() {
              return path;
            }
          };
        }
        export const languages = {
          registerCodeActionsProvider: () => ({ dispose() {} }),
          registerDocumentSymbolProvider: () => ({ dispose() {} })
        };
        export const commands = {
          registerCommand: (name, callback) => {
            __vscodeMock.commands.set(name, callback);
            return {
              dispose() {
                __vscodeMock.commands.delete(name);
              }
            };
          }
        };
        export const window = {
          get activeTextEditor() {
            return __vscodeMock.activeTextEditor;
          },
          set activeTextEditor(value) {
            __vscodeMock.activeTextEditor = value;
          },
          showSaveDialog: async (options) => {
            __vscodeMock.saveDialogCalls.push(options);
            return __vscodeMock.saveDialogResult;
          },
          showInformationMessage: async (message) => {
            __vscodeMock.informationMessages.push(message);
            return message;
          },
          showWarningMessage: async (message) => {
            __vscodeMock.warningMessages.push(message);
            return message;
          },
          showTextDocument: async (document, column) => {
            const editor = {
              document,
              column,
              selection: undefined,
              revealRange(range, revealType) {
                __vscodeMock.revealedRanges.push({ range, revealType });
              }
            };
            __vscodeMock.shownDocuments.push({ document, column, editor });
            __vscodeMock.activeTextEditor = editor;
            return editor;
          }
        };
        export const workspace = {
          fs: {
            createDirectory: async (uri) => {
              __vscodeMock.createdDirectories.push(uri);
            },
            writeFile: async (uri, content) => {
              __vscodeMock.writtenFiles.push({ uri, content });
            }
          },
          openTextDocument: async (uri) => __vscodeMock.openedDocuments.get(uri.fsPath || String(uri))
        };
        export const CodeActionKind = { QuickFix: { value: "quickfix" } };
        export const DiagnosticSeverity = { Error: 0, Warning: 1 };
        export const SymbolKind = {
          Module: 1,
          Namespace: 2,
          Struct: 22,
          Field: 7,
          Event: 23,
          Key: 20,
          EnumMember: 21
        };
        export const Uri = {
          file: (path) => uriFromPath(path),
          joinPath: (base, ...parts) => uriFromPath([base.fsPath || base.path || String(base), ...parts].join("/"))
        };
        export const ViewColumn = { One: 1, Beside: 2 };
        export const TextEditorRevealType = { InCenterIfOutsideViewport: 1 };
        export class CodeAction {
          constructor(title, kind) {
            this.title = title;
            this.kind = kind;
          }
        }
        export class Diagnostic {
          constructor(range, message, severity) {
            this.range = range;
            this.message = message;
            this.severity = severity;
          }
        }
        export class Position {
          constructor(line, character) {
            this.line = line;
            this.character = character;
          }
        }
        export class Range {
          constructor(startLine, startCharacter, endLine, endCharacter) {
            if (typeof startLine === "object" && typeof startCharacter === "object") {
              this.start = startLine;
              this.end = startCharacter;
            } else {
              this.start = { line: startLine, character: startCharacter };
              this.end = { line: endLine, character: endCharacter };
            }
          }
        }
        export class Selection extends Range {}
        export class WorkspaceEdit {
          constructor() {
            this.edits = [];
          }
          delete(uri, range) {
            this.edits.push({ kind: "delete", uri, range });
          }
          insert(uri, position, newText) {
            this.edits.push({ kind: "insert", uri, position, newText });
          }
          replace(uri, range, newText) {
            this.edits.push({ kind: "replace", uri, range, newText });
          }
        }
        export class DocumentSymbol {
          constructor(name, detail, kind, range, selectionRange) {
            this.name = name;
            this.detail = detail;
            this.kind = kind;
            this.range = range;
            this.selectionRange = selectionRange;
            this.children = [];
          }
        }
      `)
    };
  }

  return nextResolve(specifier, context);
}
