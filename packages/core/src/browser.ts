import { computeMarkVSpecRenderInvalidation } from "./render-invalidation.js";
import { composeMarkVSpecTemplate } from "./project-loader.js";
import { renderMarkVSpecHtml, renderMarkVSpecHtmlFragments } from "./renderer.js";
import { parseMarkVSpec } from "./parser.js";
import type { MarkVSpecRenderOptions } from "./types.js";

export {
  messagesForLocale,
  resolveLocale
} from "./renderer-messages.js";
export { createMarkVSpecDiagnostic, renderDiagnosticMessageForLocale, supportedDiagnosticMessageCodes } from "./diagnostic-messages.js";
export { evaluateMarkVSpecDiagnostics } from "./validation-gate.js";
export { parseMarkVSpec };
export { composeMarkVSpecTemplate };
export { renderMarkVSpecHtml, renderMarkVSpecHtmlFragment, renderMarkVSpecHtmlFragments } from "./renderer.js";
export { validateMarkVSpec } from "./validator.js";
export type {
  MarkVSpecDiagnostic,
  MarkVSpecElement,
  MarkVSpecParseResult,
  MarkVSpecRenderOptions
} from "./types.js";
export type { MarkVSpecLocale, RendererMessages } from "./renderer-messages.js";

export function renderMarkVSpecHtmlWithInvalidation(
  previousSource: string,
  currentSource: string,
  options: MarkVSpecRenderOptions = {}
): { html: string; invalidation: ReturnType<typeof computeMarkVSpecRenderInvalidation>; fragments: ReturnType<typeof renderMarkVSpecHtmlFragments> } {
  const result = parseMarkVSpec(currentSource);
  const invalidation = computeMarkVSpecRenderInvalidation(previousSource, currentSource);
  return {
    html: renderMarkVSpecHtml(result, options),
    invalidation,
    fragments: invalidation.requiresFullRender ? [] : renderMarkVSpecHtmlFragments(result, invalidation.wireframeRenderKeys, options)
  };
}
