import {
  buildStateScreenReadModels,
  buildViewportStateScreenReadModels
} from "@markvspec/core";
import type {
  FocusScope,
  MarkVSpecParseResult,
  MarkVSpecProjectLoadResult,
  RendererMessages,
  StateScreenReadModel
} from "@markvspec/core";
import {
  renderDesignDocumentSections
} from "@markvspec/document-renderer";
import { createDocumentScope } from "./document-scope.js";
import type { DocumentScope } from "./document-scope.js";
import {
  partialPreviewPathsForResult,
  partialPreviewsForResult,
  propagatePartialPreviews
} from "./partial-preview.js";
import {
  addDocumentSectionNumberHtml,
  numberDocumentSectionsHtml
} from "./preview-html-postprocess.js";
import { renderProjectDesignDocumentHtml as renderProjectDesignDocumentHtmlBase } from "./project-preview-document.js";
import {
  renderStateScreenReadModel,
  renderStateViewsSection,
  renderStateViewportSection
} from "./state-views-renderer.js";
import type { StateViewsRenderContext } from "./state-views-renderer.js";

type ParsedMarkVSpec = MarkVSpecParseResult;

export interface DesignDocumentOptions {
  focus?: FocusScope;
  messages?: RendererMessages;
  documentResult?: ParsedMarkVSpec;
}

export interface PreviewDesignDocumentRenderingSupport {
  rendererMessagesForResult(result: ParsedMarkVSpec): RendererMessages;
  projectRendererMessagesForResult(project: MarkVSpecProjectLoadResult): RendererMessages;
  setRendererMessages(result: ParsedMarkVSpec, messages: RendererMessages): void;
  renderSectionNumber(sectionNumber: string): string;
  renderScreenSpec(result: ParsedMarkVSpec): string;
  renderHistorySpec(result: ParsedMarkVSpec): string;
  renderInlineTableOfContents(result: ParsedMarkVSpec): string;
  renderStatesSpec(result: ParsedMarkVSpec, markdownResult: ParsedMarkVSpec): string;
  renderStateFlowSpec(result: ParsedMarkVSpec): string;
  renderViewContextsSpec(result: ParsedMarkVSpec, markdownResult: ParsedMarkVSpec): string;
  renderViewContextSamplesSpec(result: ParsedMarkVSpec, markdownResult: ParsedMarkVSpec): string;
  renderActionDetailsSpec(result: ParsedMarkVSpec, markdownResult: ParsedMarkVSpec): string;
  renderFormGroupsSpec(result: ParsedMarkVSpec, markdownResult: ParsedMarkVSpec): string;
  renderValidationRulesSpec(result: ParsedMarkVSpec, markdownResult: ParsedMarkVSpec): string;
  renderRulesSpec(result: ParsedMarkVSpec, markdownResult: ParsedMarkVSpec): string;
  renderErrorCodesSpec(result: ParsedMarkVSpec, markdownResult: ParsedMarkVSpec): string;
  renderNotesSpec(result: ParsedMarkVSpec): string;
  renderScreenTransitionsSpec(result: ParsedMarkVSpec): string;
  renderActionTransitionsSpec(result: ParsedMarkVSpec, markdownResult: ParsedMarkVSpec): string;
  renderDiagnosticsSpec(result: ParsedMarkVSpec): string;
  stateViewsRenderContext(result: ParsedMarkVSpec, markdownResult?: ParsedMarkVSpec): StateViewsRenderContext;
  renderWireframeFor(
    result: ParsedMarkVSpec,
    viewport: string | undefined,
    state: string | undefined,
    includeStyles: boolean,
    focus?: FocusScope,
    modelValues?: Record<string, boolean | number | string>,
    viewValues?: Record<string, boolean | number | string>,
    displayEffects?: StateScreenReadModel["displayEffects"],
    scenarioSamples?: StateScreenReadModel["scenarioSamples"],
    scenarioRoute?: StateScreenReadModel["scenarioRoute"]
  ): string;
}

export function buildDocumentScope(result: MarkVSpecParseResult, focus?: FocusScope, documentResult?: MarkVSpecParseResult): DocumentScope {
  const partials = partialPreviewsForResult(result);
  const partialPaths = partialPreviewPathsForResult(result);
  const sourceResult = documentResult ?? result;
  const scope = createDocumentScope(sourceResult, {
    focus,
    wireframeSourceResult: result,
    partialPreviews: partials,
    partialPaths
  });
  // Partial previews are keyed by parse result object; focused wireframe results need the same lookup context.
  propagatePartialPreviews(result, scope.wireframeResult);
  return scope;
}

export function createPreviewDesignDocumentRenderer(support: PreviewDesignDocumentRenderingSupport) {
  return {
    renderDesignDocumentHtml(result: ParsedMarkVSpec, options: DesignDocumentOptions = {}): string {
      const scope = buildDocumentScope(result, options.focus, options.documentResult);
      const detailsResult = scope.specResult;
      const messages = options.messages ?? support.rendererMessagesForResult(result);
      support.setRendererMessages(result, messages);
      support.setRendererMessages(scope.sourceResult, messages);
      support.setRendererMessages(detailsResult, messages);
      let sectionNumber = 1;
      const numberedSection = (render: (number: string) => string): string => {
        const number = String(sectionNumber);
        const html = render(number);
        if (!html.trim()) {
          return "";
        }
        sectionNumber += 1;
        return html;
      };
      const numberedSections = (html: string): string => {
        const numbered = numberDocumentSectionsHtml(html, sectionNumber, support.renderSectionNumber);
        sectionNumber = numbered.nextNumber;
        return numbered.html;
      };

      return renderDesignDocumentSections([
        support.renderScreenSpec(scope.sourceResult),
        support.renderHistorySpec(detailsResult),
        support.renderInlineTableOfContents(detailsResult),
        numberedSection((number) => withSectionNumber(support.renderStatesSpec(detailsResult, scope.sourceResult), number, support)),
        numberedSection((number) => withSectionNumber(support.renderStateFlowSpec(detailsResult), number, support)),
        numberedSection((number) => withSectionNumber(support.renderViewContextsSpec(detailsResult, scope.sourceResult), number, support)),
        numberedSection((number) => withSectionNumber(support.renderViewContextSamplesSpec(detailsResult, scope.sourceResult), number, support)),
        numberedSection((number) => withSectionNumber(renderViewportStateScreensSpec(scope, support, number), number, support)),
        numberedSection((number) => withSectionNumber(support.renderActionDetailsSpec(detailsResult, scope.sourceResult), number, support)),
        numberedSection((number) => withSectionNumber(support.renderFormGroupsSpec(detailsResult, scope.sourceResult), number, support)),
        numberedSection((number) => withSectionNumber(support.renderValidationRulesSpec(detailsResult, scope.sourceResult), number, support)),
        numberedSection((number) => withSectionNumber(support.renderRulesSpec(detailsResult, scope.sourceResult), number, support)),
        numberedSection((number) => withSectionNumber(support.renderErrorCodesSpec(detailsResult, scope.sourceResult), number, support)),
        numberedSections(support.renderNotesSpec(detailsResult)),
        numberedSection((number) => withSectionNumber(support.renderScreenTransitionsSpec(detailsResult), number, support)),
        numberedSection((number) => withSectionNumber(support.renderActionTransitionsSpec(detailsResult, scope.sourceResult), number, support)),
        numberedSection((number) => withSectionNumber(support.renderDiagnosticsSpec(detailsResult), number, support))
      ]);
    },
    renderProjectDesignDocumentHtml(project: MarkVSpecProjectLoadResult, messages: RendererMessages = support.projectRendererMessagesForResult(project)): string {
      return renderProjectDesignDocumentHtmlBase(project, messages);
    },
    renderViewportStateScreensSpec(scope: DocumentScope, sectionNumber?: string): string {
      return renderViewportStateScreensSpec(scope, support, sectionNumber);
    },
    renderStateScreensSpec(
      result: ParsedMarkVSpec,
      wireframeResult: ParsedMarkVSpec,
      viewport: string | undefined,
      focus?: FocusScope,
      viewportNumber?: string
    ): string {
      return renderStateScreensSpec(result, wireframeResult, viewport, focus, support, viewportNumber);
    }
  };
}

function withSectionNumber(html: string, sectionNumber: string, support: PreviewDesignDocumentRenderingSupport): string {
  return addDocumentSectionNumberHtml(html, sectionNumber, support.renderSectionNumber);
}

function renderViewportStateScreensSpec(
  scope: DocumentScope,
  support: PreviewDesignDocumentRenderingSupport,
  sectionNumber?: string
): string {
  const { specResult: detailsResult, wireframeResult, focus } = scope;
  const renderContext = support.stateViewsRenderContext(detailsResult, scope.sourceResult);
  const viewportSections = buildViewportStateScreenReadModels(detailsResult, wireframeResult, focus, stateScreenReadModelOptions(detailsResult, support))
    .map((viewportModel, index) => {
      const viewportNumber = sectionNumber ? `${sectionNumber}.${index + 1}` : undefined;
      return renderStateViewportSection(
        renderContext,
        viewportModel.viewport,
        viewportModel.isDefault,
        viewportModel.models.map((model, stateIndex) => renderStateScreenReadModel(
          detailsResult,
          renderContext,
          model,
          renderStateScreenWireframe(wireframeResult, model, stateIndex, support),
          viewportNumber ? `${viewportNumber}.${stateIndex + 1}` : undefined
        )).join(""),
        viewportNumber
      );
    })
    .join("");
  return renderStateViewsSection(renderContext, viewportSections);
}

function renderStateScreensSpec(
  result: ParsedMarkVSpec,
  wireframeResult: ParsedMarkVSpec,
  viewport: string | undefined,
  focus: FocusScope | undefined,
  support: PreviewDesignDocumentRenderingSupport,
  viewportNumber?: string
): string {
  const renderContext = support.stateViewsRenderContext(result);
  return buildStateScreenReadModels(result, wireframeResult, viewport, focus, stateScreenReadModelOptions(result, support))
    .map((model, index) => renderStateScreenReadModel(
      result,
      renderContext,
      model,
      renderStateScreenWireframe(wireframeResult, model, index, support),
      viewportNumber ? `${viewportNumber}.${index + 1}` : undefined
    ))
    .join("");
}

function stateScreenReadModelOptions(result: ParsedMarkVSpec, support: PreviewDesignDocumentRenderingSupport) {
  return {
    label: (key: "default" | "viewport") => support.rendererMessagesForResult(result)[key]
  };
}

function renderStateScreenWireframe(
  wireframeResult: ParsedMarkVSpec,
  model: StateScreenReadModel,
  index: number,
  support: PreviewDesignDocumentRenderingSupport
): string {
  return support.renderWireframeFor(wireframeResult, model.viewport, model.stateName, index === 0, model.focus, model.modelValues, model.viewValues, model.displayEffects, model.scenarioSamples, model.scenarioRoute);
}
