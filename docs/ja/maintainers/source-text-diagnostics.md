# Source Text Diagnostics

MarkVSpec は meaningful な source text を silently drop しない。source line が
parse されたにもかかわらず、render model、preview/export の semantic model、
diagnostic、または明示的な ignore rule のどれにも分類されない場合は warning にする。

## 初期 coverage

最初の実装対象は `## Actions` の `Process Pn:` bullet です。value-less な
process bullet が認識済み block label ではない場合、unrepresented source text
として分類し、diagnostic code `unrepresented-source-text` の warning を出す。

例:

```markdown
- Process P1: Submit login
  - Encode request body
  - request:
    - method: POST
    - path: /login
```

`Encode request body` は著者が書いた meaningful text だが、サポート済み process
property ではなく、render もされない。そのため parser は silently drop せず
warning として報告する。

## intentional ignore

初期 classifier は `request:`、`params:`、`result:`、`case:`、`display:`、
`update:` のような syntax-only label を warning 対象にしない。意味はその child
entry が担う。

サポート済み process detail、result entry、case entry、state effect、layout item、
element property、section prose/notes は既存 model に表現されるため、この warning
を出さない。

## 既知の制限

これは document 内の全 Markdown text node に対する完全な soundness guarantee
ではない。初期 coverage は確認済みの `Actions > Process` blind spot に限定する。
今後拡張する場合は、rendered HTML の raw string 検索ではなく、section ごとの
classifier を追加する。
