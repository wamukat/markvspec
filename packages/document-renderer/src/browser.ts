import { renderStaticDesignDocumentHtml } from "./index.js";
import type { RenderStaticDesignDocumentOptions } from "./index.js";
import type { MarkVSpecParseResult } from "@markvspec/core/browser";

export type BrowserDesignDocumentRenderOptions = RenderStaticDesignDocumentOptions;

export function renderBrowserDesignDocumentHtml(
  result: MarkVSpecParseResult,
  options: BrowserDesignDocumentRenderOptions = {}
): string {
  return renderStaticDesignDocumentHtml(result, options);
}

export { renderStaticDesignDocumentHtml } from "./index.js";
export type { RenderStaticDesignDocumentOptions } from "./index.js";
