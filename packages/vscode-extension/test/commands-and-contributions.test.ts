import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { parseMarkVSpec } from "@markvspec/core";
import { formatMarkVSpecStructure } from "../src/extension.js";

const extensionRoot = resolve(".");

function expandSnippetBody(body: string[]): string {
  return body.join("\n")
    .replace(/\$\{\d+\|([^|}]*)\|\}/g, (_match, choices: string) => choices.split(",")[0] ?? "")
    .replace(/\$\{\d+:([^}]*)\}/g, "$1")
    .replace(/\$\{\d+\}/g, "")
    .replace(/\$\d+/g, "");
}

test("formats recognized MarkVSpec sections conservatively", () => {
  const spaces = "   ";
  const source = `---
id: SCR-FORMAT
type: screen
title: Format
---

# SCR-FORMAT Format

## States


- idle*${spaces}


## Layout: mobile
### L-Page Page${spaces}

- stack${spaces}

#### Items
- E-Title${spaces}

## Elements
### E-Title Heading${spaces}
- action: A-Submit
- value: Title${spaces}

## Actions
### A-Submit Submit
- From
  - idle${spaces}
`;

  assert.equal(formatMarkVSpecStructure(source), `---
id: SCR-FORMAT
type: screen
title: Format
---

# SCR-FORMAT Format

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

## Elements

### E-Title Heading

- action: A-Submit
- value: Title

## Actions

### A-Submit Submit

- From
  - idle
`);
});

test("preserves unknown sections while formatting recognized sections", () => {
  const spaces = "   ";
  const source = `---
id: SCR-FORMAT-UNKNOWN
type: screen
title: Format Unknown
---

# SCR-FORMAT-UNKNOWN Format Unknown

## States


- idle*${spaces}

## Draft Notes

This prose keeps trailing spaces.${spaces}


| A | B |
|---|---|
| 1 | 2 |

## Elements
### E-Title Heading${spaces}
- value: Title${spaces}
`;

  assert.equal(formatMarkVSpecStructure(source), `---
id: SCR-FORMAT-UNKNOWN
type: screen
title: Format Unknown
---

# SCR-FORMAT-UNKNOWN Format Unknown

## States

- idle*

## Draft Notes

This prose keeps trailing spaces.${spaces}


| A | B |
|---|---|
| 1 | 2 |

## Elements

### E-Title Heading

- value: Title
`);
});

test("declares MarkVSpec syntax highlighting contributions", () => {
  const packageJsonPath = resolve(extensionRoot, "package.json");
  const grammarPath = resolve(extensionRoot, "syntaxes/markvspec.tmLanguage.json");
  const languageConfigurationPath = resolve(extensionRoot, "language-configuration/markvspec.configuration.json");
  const snippetsPath = resolve(extensionRoot, "snippets/markvspec.code-snippets");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    capabilities?: {
      untrustedWorkspaces?: { supported?: string; description?: string };
    };
    contributes?: {
      commands?: Array<{ command?: string; title?: string; category?: string; icon?: string }>;
      grammars?: Array<{ language?: string; scopeName?: string; path?: string }>;
      languages?: Array<{ id?: string; configuration?: string; extensions?: string[] }>;
      menus?: Record<string, Array<{ command?: string; when?: string; group?: string }>>;
      snippets?: Array<{ language?: string; path?: string }>;
    };
  };
  const grammar = JSON.parse(readFileSync(grammarPath, "utf8")) as {
    scopeName?: string;
    repository?: Record<string, {
      patterns?: Array<{
        match?: string;
        name?: string;
      }>;
    }>;
  };
  const languageConfiguration = JSON.parse(readFileSync(languageConfigurationPath, "utf8")) as {
    wordPattern?: string;
  };
  const snippets = JSON.parse(readFileSync(snippetsPath, "utf8")) as Record<string, {
    body?: string[];
    description?: string;
    prefix?: string;
  }>;

  assert(existsSync(languageConfigurationPath));
  assert(existsSync(snippetsPath));
  assert.deepEqual(packageJson.contributes?.grammars?.[0], {
    language: "markvspec",
    scopeName: "source.markvspec",
    path: "./syntaxes/markvspec.tmLanguage.json"
  });
  assert.equal(packageJson.contributes?.languages?.[0]?.configuration, "./language-configuration/markvspec.configuration.json");
  assert(packageJson.contributes?.languages?.[0]?.extensions?.includes(".vspec.md"));
  assert(packageJson.contributes?.languages?.[0]?.extensions?.includes(".vspec.project.md"));
  assert.equal(packageJson.capabilities?.untrustedWorkspaces?.supported, "limited");
  assert.match(packageJson.capabilities?.untrustedWorkspaces?.description ?? "", /opening referenced local files from the webview is blocked/);
  assert((packageJson as { activationEvents?: string[] }).activationEvents?.includes("onLanguage:markvspec"));
  assert((packageJson as { activationEvents?: string[] }).activationEvents?.includes("onCommand:markvspec.openPreview"));
  assert((packageJson as { activationEvents?: string[] }).activationEvents?.includes("onCommand:markvspec.formatStructure"));
  assert((packageJson as { activationEvents?: string[] }).activationEvents?.includes("onCommand:markvspec.exportHtml"));
  assert((packageJson as { activationEvents?: string[] }).activationEvents?.includes("onCommand:markvspec.exportPdf"));
  assert((packageJson as { activationEvents?: string[] }).activationEvents?.includes("onCommand:markvspec.refreshPreview"));
  assert.deepEqual(packageJson.contributes?.commands?.[0], {
    command: "markvspec.openPreview",
    title: "Open Preview",
    category: "MarkVSpec",
    icon: "$(open-preview)"
  });
  assert.deepEqual(packageJson.contributes?.commands?.[1], {
    command: "markvspec.formatStructure",
    title: "Format Structure",
    category: "MarkVSpec",
    icon: "$(symbol-structure)"
  });
  assert.deepEqual(packageJson.contributes?.commands?.[2], {
    command: "markvspec.exportHtml",
    title: "Export Static HTML",
    category: "MarkVSpec",
    icon: "$(file-code)"
  });
  assert.deepEqual(packageJson.contributes?.commands?.[3], {
    command: "markvspec.exportPdf",
    title: "Export PDF",
    category: "MarkVSpec",
    icon: "$(file-pdf)"
  });
  assert.deepEqual(packageJson.contributes?.commands?.[4], {
    command: "markvspec.refreshPreview",
    title: "Refresh Preview",
    category: "MarkVSpec",
    icon: "$(refresh)"
  });
  assert.deepEqual(packageJson.contributes?.menus?.["editor/title"]?.[0], {
    command: "markvspec.openPreview",
    when: "resourceFilename =~ /(^|\\.)vspec(\\.project)?\\.md$/",
    group: "navigation"
  });
  assert.deepEqual(packageJson.contributes?.menus?.["editor/title"]?.[1], {
    command: "markvspec.exportHtml",
    when: "resourceFilename =~ /(^|\\.)vspec(\\.project)?\\.md$/",
    group: "navigation@2"
  });
  assert.deepEqual(packageJson.contributes?.menus?.["editor/title"]?.[2], {
    command: "markvspec.exportPdf",
    when: "resourceFilename =~ /(^|\\.)vspec(\\.project)?\\.md$/",
    group: "navigation@3"
  });
  assert.deepEqual(packageJson.contributes?.menus?.["explorer/context"]?.[0], {
    command: "markvspec.openPreview",
    when: "resourceFilename =~ /(^|\\.)vspec(\\.project)?\\.md$/",
    group: "navigation"
  });
  assert.deepEqual(packageJson.contributes?.menus?.["explorer/context"]?.[1], {
    command: "markvspec.exportHtml",
    when: "resourceFilename =~ /(^|\\.)vspec(\\.project)?\\.md$/",
    group: "navigation@2"
  });
  assert.deepEqual(packageJson.contributes?.menus?.["explorer/context"]?.[2], {
    command: "markvspec.exportPdf",
    when: "resourceFilename =~ /(^|\\.)vspec(\\.project)?\\.md$/",
    group: "navigation@3"
  });
  assert.deepEqual(packageJson.contributes?.snippets?.[0], {
    language: "markvspec",
    path: "./snippets/markvspec.code-snippets"
  });
  assert.equal(grammar.scopeName, "source.markvspec");
  assert(grammar.repository?.["front-matter"]);
  assert(grammar.repository?.["headings"]);
  assert(grammar.repository?.["action-groups"]);
  assert(grammar.repository?.["references"]);
  assert(grammar.repository?.["properties"]?.patterns?.some((pattern) => pattern.name === "meta.property.marker.markvspec"));
  assert(!grammar.repository?.["references"]?.patterns?.some((pattern) => pattern.name === "constant.other.marker.markvspec"));

  const grammarSource = readFileSync(grammarPath, "utf8");
  for (const token of ["SCR|TPL|PRT", "L|P|E|F|A|V|R", "L|P", "E-", "F-", "A-", "V-", "R-", "Slot", "Events", "Process", "View Context", "View Context Samples", "Preview Scenarios", "Form Groups", "Business Rules", "Error Codes", "History Fields", "History", "params", "group", "stop|continue"]) {
    assert.match(grammarSource, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  const headingPatterns = grammar.repository?.["headings"]?.patterns ?? [];
  const sectionHeadingPatterns = headingPatterns
    .filter((pattern) => pattern.name === "markup.heading.section.markvspec")
    .map((pattern) => new RegExp(pattern.match ?? "$.", "u"));
  assert(sectionHeadingPatterns.some((pattern) => pattern.test("## Layout")));
  assert(sectionHeadingPatterns.some((pattern) => pattern.test("## Layout: mobile")));
  assert(sectionHeadingPatterns.some((pattern) => pattern.test("## Form Groups")));
  assert(sectionHeadingPatterns.some((pattern) => pattern.test("## View Context")));
  assert(sectionHeadingPatterns.some((pattern) => pattern.test("## Preview Scenarios")));
  assert(headingPatterns.some((pattern) => pattern.name === "markup.heading.object.markvspec" && new RegExp(pattern.match ?? "$.", "u").test("### P-Fields Fields")));
  assert(headingPatterns.some((pattern) => pattern.name === "markup.heading.object.markvspec" && new RegExp(pattern.match ?? "$.", "u").test("### F-LoginForm Login form")));
  assert(headingPatterns.some((pattern) => pattern.name === "markup.heading.object.markvspec" && new RegExp(pattern.match ?? "$.", "u").test("### V-LoginForm Login form validation")));
  assert(headingPatterns.some((pattern) => pattern.name === "markup.heading.object.markvspec" && new RegExp(pattern.match ?? "$.", "u").test("### loaded")));
  assert(headingPatterns.some((pattern) => pattern.name === "markup.heading.subsection.markvspec" && new RegExp(pattern.match ?? "$.", "u").test("#### \${model.noticeList.items}")));

  assert(languageConfiguration.wordPattern);
  assert(!languageConfiguration.wordPattern.includes("\\p"));
  const wordPattern = new RegExp(languageConfiguration.wordPattern);
  for (const token of ["SCR-DASHBOARD", "L-メッセージ表示", "E-メールアドレス入力", "A-SubmitLogin", "R-RequiredFields", "E-ページヘッダ"]) {
    assert.equal(wordPattern.exec(token)?.[0], token);
  }

  for (const snippetName of [
    "MarkVSpec Screen",
    "MarkVSpec States",
    "MarkVSpec Partial",
    "MarkVSpec Responsive Layouts",
    "MarkVSpec Layout Group",
    "MarkVSpec Input Element",
    "MarkVSpec Button Element",
    "MarkVSpec Select Element",
    "MarkVSpec Action"
  ]) {
    assert(snippets[snippetName]?.prefix);
    assert(snippets[snippetName]?.description);
    assert(snippets[snippetName]?.body?.length);
  }
  assert(snippets["MarkVSpec Screen"].body?.includes("## States"));
  assert(snippets["MarkVSpec Partial"].body?.includes("type: partial"));
  assert(snippets["MarkVSpec Partial"].body?.includes("- partial.render: ${11:A-BuildPartial}"));
  assert(snippets["MarkVSpec Screen"].body?.includes("## Layout: ${4:mobile}"));
  assert(snippets["MarkVSpec Responsive Layouts"].body?.includes("## Layout: desktop"));
  assert(snippets["MarkVSpec Layout Group"].body?.includes("#### Items"));
  assert(snippets["MarkVSpec Input Element"].body?.includes("### ${1:1}:${2:E-Input} Input"));
  assert(!snippets["MarkVSpec Input Element"].body?.includes("Input*"));
  assert(snippets["MarkVSpec Button Element"].body?.includes("- variant: ${4|primary,secondary,tertiary|}"));
  assert(snippets["MarkVSpec Button Element"].body?.includes("- tone: ${5|neutral,info,success,warning,danger|}"));
  assert(snippets["MarkVSpec Select Element"].body?.includes("- options:"));
  assert(snippets["MarkVSpec Select Element"].body?.includes("  - ${4:Active}"));
  assert(!snippets["MarkVSpec Action"].body?.includes("- Triggered"));
  assert(snippets["MarkVSpec Action"].body?.includes("- Process ${5:P1}: ${6:Submit request}"));
  assert(snippets["MarkVSpec Action"].body?.includes("  - case: ${11:sent}"));
  assert(!snippets["MarkVSpec Action"].body?.includes("- Effects"));
  assert(!snippets["MarkVSpec Action"].body?.includes("- Cases"));

  const expandedScreenSnippet = expandSnippetBody(snippets["MarkVSpec Screen"].body ?? []);
  assert.deepEqual(parseMarkVSpec(expandedScreenSnippet).diagnostics, []);

  const expandedPartialSnippet = expandSnippetBody(snippets["MarkVSpec Partial"].body ?? []);
  assert.deepEqual(parseMarkVSpec(expandedPartialSnippet).diagnostics, []);

  const expandedSelectSnippet = expandSnippetBody(snippets["MarkVSpec Select Element"].body ?? []);
  const selectSource = `---
id: SCR-SNIPPET
type: screen
title: Snippet
---

# SCR-SNIPPET Snippet

## States

- idle*

## Layout: mobile

### L1:L-Page Page

- stack

#### Items

- E-Select

## Elements

${expandedSelectSnippet}
`;
  const selectResult = parseMarkVSpec(selectSource);
  assert.deepEqual(selectResult.diagnostics, []);
  assert.deepEqual(selectResult.elements[0]?.selectOptions.map((option) => option.label), ["Active", "Inactive"]);
});
