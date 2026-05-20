import {
  displaySummaryForElementProperties,
  elementDomainFor,
  formControlDisplayValue,
  formControlSpecForElement
} from "@markvspec/core";
import type { MarkVSpecElement, MarkVSpecParseResult, MessageKey } from "@markvspec/core";
import { text } from "./design-document-renderer.js";
import { firstEntityProseParagraph } from "./markdown-renderer.js";

type ParsedElement = MarkVSpecParseResult["elements"][number];

export interface ElementSpecSummaryRenderer {
  renderElementLabelSummary(properties: Record<string, string | true>): string;
  renderElementDescription(element: ParsedElement): string;
  renderFormControlValue(element: ParsedElement, sampleValue: string | undefined): string;
  renderFormControlSource(element: ParsedElement): string;
  renderInputSpec(element: ParsedElement): string;
  renderRequiredSpec(element: ParsedElement): string;
}

export interface ElementSpecSummaryRendererDependencies {
  label(key: MessageKey): string;
  renderEntityNotes(notes: string[] | undefined): string;
  renderExpressionTokens(source: string): string;
  renderParamSource(source: string): string;
  renderSourceSummary(value: string | true | undefined): string;
  renderValueWithOptionalSource(value: string, source: string | true | undefined): string;
}

export function createElementSpecSummaryRenderer(
  dependencies: ElementSpecSummaryRendererDependencies
): ElementSpecSummaryRenderer {
  return {
    renderElementLabelSummary(properties) {
      const summary = displaySummaryForElementProperties(properties);
      const labelValue = summary.label;
      const labelSource = dependencies.renderSourceSummary(summary.labelSource);
      return [labelValue, labelSource].filter(Boolean).join("<br>");
    },

    renderElementDescription(element) {
      const domain = elementDomainFor(element);
      const overlay = domain.anchoredOverlay();
      const summary = domain.displaySummary();
      const description = summary.description
        || summary.purpose
        || firstEntityProseParagraph(element.overview)
        || (domain.is("Tabs") && summary.active ? `active tab: ${summary.active}` : "")
        || (domain.is("Accordion") && summary.open ? `open item: ${summary.open}` : "")
        || (domain.is("Disclosure") && summary.open ? `open: ${summary.open}` : "")
        || (domain.is("ActionMenu") && summary.open ? `open: ${summary.open}` : "")
        || (overlay?.anchorId ? `anchor: ${overlay.anchorId}` : "")
        || "";
      const notes = dependencies.renderEntityNotes(element.notes);
      return [description ? text(description) : "", notes].filter(Boolean).join("<br>");
    },

    renderFormControlValue(element, sampleValue) {
      const renderedValue = formControlDisplayValue(element, sampleValue);
      return renderedValue ? dependencies.renderExpressionTokens(renderedValue) : "";
    },

    renderFormControlSource(element) {
      const spec = formControlSpecForElement(element);
      return [
        dependencies.renderSourceSummary(spec.sourceKind),
        spec.sourceDetail ? dependencies.renderSourceSummary(spec.sourceDetail) : ""
      ].filter(Boolean).join("<br>");
    },

    renderInputSpec(element) {
      const spec = formControlSpecForElement(element);
      const inputRows = [
        ...spec.inputProperties.map((property) => `${text(property.key)}: ${dependencies.renderParamSource(property.value ?? "")}`),
        spec.options.length > 0
          ? `${text(dependencies.label("options"))}: ${spec.options.map((option) => dependencies.renderValueWithOptionalSource(option.label, option.source)).join(", ")}`
          : ""
      ].filter(Boolean);
      const constraintRows = [
        ...spec.constraintProperties.map((property) => property.value ? `${text(property.key)}: ${dependencies.renderParamSource(property.value)}` : text(property.key)),
        spec.readonly ? text(dependencies.label("readonly")).toLowerCase() : ""
      ].filter(Boolean);
      return renderSpecSections([
        { title: dependencies.label("input"), rows: inputRows },
        { title: dependencies.label("constraints"), rows: constraintRows },
        { title: dependencies.label("format"), rows: spec.format ? [dependencies.renderParamSource(spec.format)] : [] }
      ]);
    },

    renderRequiredSpec(element) {
      const spec = formControlSpecForElement(element);
      const requiredWhenRows = spec.requiredWhen
        .map((condition) => `${dependencies.label("conditionWhenShort")}: ${dependencies.renderParamSource(condition)}`);
      const rows = [
        spec.required ? text(dependencies.label("requiredYes")) : requiredWhenRows.length === 0 ? text(dependencies.label("requiredNo")) : "",
        ...requiredWhenRows
      ].filter(Boolean);

      return rows.length === 1 ? rows[0] ?? "" : rows.length > 1 ? `<ul class="spec-list">${rows.map((row) => `<li>${row}</li>`).join("")}</ul>` : "";
    }
  };
}

export function renderElementTypeSummary(element: MarkVSpecElement): string {
  return text(element.type);
}

export function renderElementValueSummary(properties: Record<string, string | true>): string {
  return displaySummaryForElementProperties(properties).valueSummary ?? "";
}

export function renderSpecSections(sections: Array<{ title: string; rows: string[] }>): string {
  const visibleSections = sections.filter((section) => section.rows.length > 0);
  if (visibleSections.length === 0) {
    return "";
  }
  return visibleSections.map((section) => (
    `<div class="spec-section"><strong>${text(section.title)}</strong><ul class="spec-list">${section.rows.map((row) => `<li>${row}</li>`).join("")}</ul></div>`
  )).join("");
}
