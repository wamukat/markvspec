import {
  buildProjectTransitionGraph,
  messagesForLocale,
  renderDiagnosticMessageForLocale,
  renderProjectTransitionMermaid
} from "@markvspec/core";
import type { MarkVSpecProjectLoadResult, MessageKey, RendererMessages } from "@markvspec/core";
import { code, escapeHtml, renderTable, text } from "./design-document-renderer.js";
import { isDocumentRefId, renderDocumentRefId } from "./entity-reference-presenter.js";
import { renderEntityNotes, renderEntityOverview } from "./markdown-renderer.js";
import { renderPreviewIcon } from "./preview-icons.js";

export function renderProjectDesignDocumentHtml(project: MarkVSpecProjectLoadResult, messages: RendererMessages = messagesForLocale(undefined)): string {
  const graph = buildProjectTransitionGraph(project);
  const diagram = renderProjectTransitionMermaid(graph);
  return `<article class="document">
    ${renderProjectSpec(project, messages)}
    ${renderProjectNotesSpec(project, messages)}
    ${renderProjectTemplatesSpec(project, messages)}
    ${renderProjectScreensSpec(project, messages)}
    <section class="doc-section">
      <h2>${escapeHtml(pLabel(messages, "projectTransitionDiagram"))}</h2>
      <pre class="mermaid-source" data-mermaid-source><code class="language-mermaid">${escapeHtml(diagram)}</code></pre>
    </section>
    ${renderProjectTransitionsSpec(project, messages)}
    ${renderProjectDiagnosticsSpec(project, messages)}
  </article>`;
}

function pLabel(messages: RendererMessages, key: MessageKey): string {
  return messages[key];
}

function renderProjectSpec(project: MarkVSpecProjectLoadResult, messages: RendererMessages): string {
  const summary = project.project.project;
  const description = summary.description ? renderEntityOverview(summary.description.split(/\r?\n/u)) : "";
  return `<section class="doc-section">
    <h2>${escapeHtml(pLabel(messages, "project"))}</h2>
    ${renderProjectKeyValueTable(messages, [
      [pLabel(messages, "id"), summary.id],
      [pLabel(messages, "title"), summary.title]
    ])}
    ${description ? `<h3>${escapeHtml(pLabel(messages, "projectOverview"))}</h3>${description}` : ""}
  </section>`;
}

function renderProjectNotesSpec(project: MarkVSpecProjectLoadResult, messages: RendererMessages): string {
  const sections = project.project.notes
    .map((section) => {
      const notes = renderEntityNotes(section.lines);
      return notes ? `<section class="project-note-section"><h3>${text(section.title)}</h3>${notes}</section>` : "";
    })
    .filter(Boolean);
  if (sections.length === 0) {
    return "";
  }

  return `<section class="doc-section project-notes-section">
    <h2>${escapeHtml(pLabel(messages, "projectNotes"))}</h2>
    ${sections.join("")}
  </section>`;
}

function renderProjectTemplatesSpec(project: MarkVSpecProjectLoadResult, messages: RendererMessages): string {
  if (project.templates.length === 0) {
    return "";
  }

  return `<section class="doc-section">
    <h2>${escapeHtml(pLabel(messages, "templates"))}</h2>
    ${renderProjectTable(messages,
      [pLabel(messages, "template"), pLabel(messages, "title"), pLabel(messages, "path"), pLabel(messages, "status")],
      project.templates.map((template) => [
        template.index.id ? renderDocumentRefId(template.index.id) : "",
        text(template.result?.screen.title ?? template.index.title),
        text(template.resolvedPath ?? template.index.path),
        text(template.result ? pLabel(messages, "loaded") : pLabel(messages, "missing"))
      ])
    )}
  </section>`;
}

function renderProjectScreensSpec(project: MarkVSpecProjectLoadResult, messages: RendererMessages): string {
  return `<section class="doc-section">
    <h2>${escapeHtml(pLabel(messages, "screens"))}</h2>
    ${renderProjectTable(messages,
      [pLabel(messages, "screen"), pLabel(messages, "title"), pLabel(messages, "route"), pLabel(messages, "path")],
      project.screens.map((screen) => [
        screen.index.id ? renderDocumentRefId(screen.index.id) : "",
        text(screen.result?.screen.title ?? screen.index.title),
        text(screen.result?.screen.route),
        text(screen.resolvedPath ?? screen.index.path)
      ])
    )}
  </section>`;
}

function renderProjectTransitionsSpec(project: MarkVSpecProjectLoadResult, messages: RendererMessages): string {
  const graph = buildProjectTransitionGraph(project);
  return `<section class="doc-section">
    <h2>${escapeHtml(pLabel(messages, "projectTransitions"))}</h2>
    ${renderProjectTable(messages,
      [pLabel(messages, "src"), pLabel(messages, "action"), pLabel(messages, "from"), pLabel(messages, "result"), pLabel(messages, "targetType"), pLabel(messages, "target")],
      graph.edges.map((edge) => [
        renderDocumentRefId(edge.sourceScreenId),
        text([edge.actionMarker, edge.actionName].filter(Boolean).join(" ")),
        code(edge.fromState),
        text(edge.result || "-"),
        text(edge.targetType),
        renderNavigationTarget(edge.target)
      ])
    )}
  </section>`;
}

function renderProjectDiagnosticsSpec(project: MarkVSpecProjectLoadResult, messages: RendererMessages): string {
  return `<section class="doc-section">
    <h2>${escapeHtml(pLabel(messages, "diagnostics"))}</h2>
    ${renderProjectTable(messages,
      [pLabel(messages, "severity"), pLabel(messages, "line"), pLabel(messages, "message")],
      project.diagnostics.map((diagnostic) => [
        renderDiagnosticSeverity(diagnostic.severity),
        diagnostic.line ? String(diagnostic.line) : "",
        text(renderDiagnosticMessageForLocale(diagnostic, project.project.project.frontMatter["locale"]))
      ])
    )}
  </section>`;
}


function renderDiagnosticSeverity(severity: string): string {
  if (severity === "error") {
    return `<span class="mm-diagnostic-severity mm-diagnostic-severity-error">${renderPreviewIcon("circle-x")}${text(severity)}</span>`;
  }
  if (severity === "warning") {
    return `<span class="mm-diagnostic-severity mm-diagnostic-severity-warning">${renderPreviewIcon("triangle-alert")}${text(severity)}</span>`;
  }
  if (severity === "info") {
    return `<span class="mm-diagnostic-severity mm-diagnostic-severity-info">${renderPreviewIcon("info")}${text(severity)}</span>`;
  }
  return text(severity);
}

function renderNavigationTarget(target: string): string {
  return isDocumentRefId(target) ? renderDocumentRefId(target) : text(target);
}

function renderProjectKeyValueTable(messages: RendererMessages, rows: Array<[string, string | undefined]>): string {
  return renderTable([pLabel(messages, "field"), pLabel(messages, "value")], rows.map(([key, value]) => [text(key), text(value)]), pLabel(messages, "none"));
}

function renderProjectTable(messages: RendererMessages, headers: string[], rows: Array<Array<string | undefined>>): string {
  return renderTable(headers, rows, pLabel(messages, "none"));
}
