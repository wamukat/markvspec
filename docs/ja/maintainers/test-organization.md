# テスト配置方針

## VS Code extension

- `packages/vscode-extension/src/extension.test.ts`
  - preview shell、document rendering、project preview、export、code action、formatter など、拡張機能の横断的な振る舞いを扱う。
- `packages/vscode-extension/src/state-views.test.ts`
  - State Views のうち、viewport/state ごとの現状態表示、既出マーカー、layout signature など、State Views固有の回帰テストを扱う。

既存の初期 State Views テストの一部は `extension.test.ts` に残っている。新規の State Views 仕様追加や既出制御の変更は `state-views.test.ts` に追加し、既存テストを触る時も順次移動する。HTML 全体への正規表現ではなく、state/viewport section を切り出して、対象の行・fragment・read model を確認する。

## Core

`packages/core/src/index.test.ts` は次の順で分割する。

1. parser / action parser / markdown section AST
2. renderer / layout resolution / State Views signatures
3. validator / diagnostics / route and model path checks
4. project loader / project parser / composition / graph

新規仕様を追加する時は、該当する責務の専用 test file を先に作り、既存の `index.test.ts` へ追記しない。
