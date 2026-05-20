import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { loadMarkVSpecProject } from "@markvspec/core";
import { renderProjectDesignDocumentHtml } from "../src/project-preview-document.js";

test("renders project document HTML without importing the VS Code extension facade", () => {
  const projectPath = resolve("../../packages/core/test-fixtures/parse-output-coverage/project/markvspec.project.md");
  const project = loadMarkVSpecProject(readFileSync(projectPath, "utf8"), {
    projectPath,
    readFile: (path) => existsSync(path) ? readFileSync(path, "utf8") : undefined
  });

  const html = renderProjectDesignDocumentHtml(project);

  assert.match(html, /PRJ-COVERAGE-SENTINEL/);
  assert.match(html, /<h3>Project Overview<\/h3>[\s\S]*Project lead sentinel for project-level preview and export coverage\./);
  assert.match(html, /<h2>Project Notes<\/h2>[\s\S]*<h3>Notes<\/h3>[\s\S]*Project notes sentinel for project preview only\./);
  assert.match(html, /<h3>Operations Memo<\/h3>[\s\S]*Project custom note sentinel for project preview only\./);
  assert(html.indexOf("Project Notes") < html.indexOf("Templates"), "Project Notes should render before Templates");
  assert.match(html, /Project Transition Diagram/);
  assert.match(html, /SCR_COVERAGE_PROJECT --&gt;/);
});
