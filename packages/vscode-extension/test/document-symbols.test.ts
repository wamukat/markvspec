import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createMarkVSpecDocumentSymbols } from "../src/document-symbol-provider.js";

function createTextDocument(source: string, filePath = "/workspace/example.vspec.md") {
  const lines = source.split(/\r?\n/);
  return {
    getText: () => source,
    lineAt: (line: number) => ({ text: lines[line] ?? "" }),
    lineCount: lines.length,
    uri: { scheme: "file", fsPath: filePath },
    languageId: "markvspec",
    fileName: filePath
  };
}

test("creates document symbols for MarkVSpec structure", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/login-basic.vspec.md"), "utf8");
  const symbols = createMarkVSpecDocumentSymbols(createTextDocument(source) as never);
  const screen = symbols[0];

  assert.equal(screen.name, "SCR-LOGIN Login");
  assert.equal(screen.detail, "Screen");
  assert.equal(screen.selectionRange.start.line, 8);
  assert.deepEqual(screen.children.map((child) => child.name), [
    "States",
    "Layout: mobile",
    "Layout: desktop",
    "Elements",
    "Form Groups",
    "Actions",
    "Preview Scenarios",
    "Cross-field Validations",
    "Business Rules"
  ]);

  const states = screen.children.find((child) => child.name === "States");
  assert.deepEqual(states?.children.map((child) => `${child.name}:${child.detail}`), [
    "idle:initial state",
    "authenticating:state"
  ]);

  const mobileLayout = screen.children.find((child) => child.name === "Layout: mobile");
  assert(mobileLayout);
  assert(mobileLayout.children.some((child) => child.name === "L1:L-Page Login page" && child.detail === "mobile"));
  assert(mobileLayout.children.some((child) => child.name === "L7:L-AuthProgress Auth progress" && child.detail === "mobile"));

  const desktopLayout = screen.children.find((child) => child.name === "Layout: desktop");
  assert(desktopLayout);
  assert(desktopLayout.children.some((child) => child.name === "L8:L-DesktopActions Desktop actions" && child.detail === "desktop"));

  const elements = screen.children.find((child) => child.name === "Elements");
  assert(elements);
  assert(elements.children.some((child) => child.name === "1:E-PageTitle" && child.detail === "Heading"));
  assert(elements.children.some((child) => child.name === "3:E-EmailInput" && child.detail === "Input"));

  const formGroups = screen.children.find((child) => child.name === "Form Groups");
  assert(formGroups);

  const actions = screen.children.find((child) => child.name === "Actions");
  assert(actions);
  assert.deepEqual(actions.children.map((child) => child.name), [
    "A1:A-SubmitLogin Submit login",
    "A2:A-HandleLoginResponse Handle login response",
    "A3:A-ForgotPassword Open password reset"
  ]);

  const rules = screen.children.find((child) => child.name === "Business Rules");
  assert(rules);
  assert.deepEqual(rules.children.map((child) => child.name), [
    "R1:R-AUTH-001"
  ]);
});

test("creates document symbols for Japanese IDs and names", () => {
  const source = `---
id: SCR-JA
type: screen
title: 日本語画面
---

# SCR-JA 日本語画面

## States

- 初期*

## Layout: mobile

### 1:L-日本語フォーム 日本語フォーム

- stack

#### Items

- E-ページヘッダ

## Elements

### 2:E-ページヘッダ 見出し

- value: ようこそ

## Actions

### A1:A-日本語操作 日本語操作

- Triggered
  - E-ページヘッダ.click

## Validations

### V-日本語検証 日本語検証

- target: E-ページヘッダ
- condition: E-ページヘッダ が表示されていること
- message: 日本語検証メッセージ

## Model Samples

### 初期

#### \${model.お知らせ.items}

| title |
| --- |
| お知らせ |

## Business Rules

### R1:R-日本語業務ルール 業務ルール

- 日本語の業務ルールを書けること。

## Error Codes

### ER1:ERR-日本語 日本語エラー

- business rule: R-日本語業務ルール
- target: E-ページヘッダ
- message: 日本語エラー
- display: inline
`;
  const screen = createMarkVSpecDocumentSymbols(createTextDocument(source) as never)[0];
  const states = screen.children.find((child) => child.name === "States");
  const layout = screen.children.find((child) => child.name === "Layout: mobile");
  const elements = screen.children.find((child) => child.name === "Elements");
  const actions = screen.children.find((child) => child.name === "Actions");
  const validations = screen.children.find((child) => child.name === "Validations");
  const businessRules = screen.children.find((child) => child.name === "Business Rules");
  const errorCodes = screen.children.find((child) => child.name === "Error Codes");

  assert.equal(screen.name, "SCR-JA 日本語画面");
  assert.equal(states?.children[0]?.name, "初期");
  assert.equal(layout?.children[0]?.name, "1:L-日本語フォーム 日本語フォーム");
  assert.equal(elements?.children[0]?.name, "2:E-ページヘッダ");
  assert.equal(elements?.children[0]?.detail, "見出し");
  assert.equal(actions?.children[0]?.name, "A1:A-日本語操作 日本語操作");
  assert.equal(validations?.children[0]?.name, "V-日本語検証 日本語検証");
  const modelSamples = screen.children.find((child) => child.name === "Model Samples");
  assert.equal(modelSamples?.detail, "Section");
  assert.deepEqual(modelSamples?.children, []);
  assert.equal(businessRules?.children[0]?.name, "R1:R-日本語業務ルール 業務ルール");
  assert.equal(errorCodes?.children[0]?.name, "ER1:ERR-日本語 日本語エラー");
});
