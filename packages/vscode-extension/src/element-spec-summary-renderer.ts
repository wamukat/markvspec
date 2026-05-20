import {
  displaySummaryForElement,
  displaySummaryForElementProperties,
  elementDomainFor,
  sourceTypeForElement
} from "@markvspec/core";
import type { MarkVSpecElement, MarkVSpecParseResult, MessageKey } from "@markvspec/core";
import { rawStringProperty, stringProperty, text } from "./design-document-renderer.js";
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
      const summary = displaySummaryForElement(element);
      const initialValue = summary.initialValue ?? "";
      const value = summary.value ?? "";
      const renderedValue = sampleValue ?? (initialValue || value);
      return renderedValue ? dependencies.renderExpressionTokens(renderedValue) : "";
    },

    renderFormControlSource(element) {
      const valueMetadata = element.propertyMetadata["value"];
      const sourceKind = valueMetadata?.kind ?? sourceTypeForElement(element);
      const sourceDetail = valueMetadata?.source;
      return [
        dependencies.renderSourceSummary(sourceKind),
        sourceDetail ? dependencies.renderSourceSummary(sourceDetail) : ""
      ].filter(Boolean).join("<br>");
    },

    renderInputSpec(element) {
      const inputRows = [
        ...["type", "mode"].map((key) => {
          const value = rawStringProperty(element.properties[key]);
          return value ? `${text(key)}: ${dependencies.renderParamSource(value)}` : "";
        }),
        element.selectOptions.length > 0
          ? `${text(dependencies.label("options"))}: ${element.selectOptions.map((option) => dependencies.renderValueWithOptionalSource(option.label, option.source)).join(", ")}`
          : ""
      ].filter(Boolean);
      const constraintRows = [
        ...element.inputRules
          .filter((rule) => !isRequiredInputRule(rule))
          .map((rule) => rule.value ? `${text(rule.key)}: ${dependencies.renderParamSource(rule.value)}` : text(rule.key)),
        ...["min", "max", "step", "min length", "max length", "accept", "multiple"].map((key) => {
          const property = element.properties[key];
          const value = rawStringProperty(property);
          if (value) {
            return `${text(key)}: ${dependencies.renderParamSource(value)}`;
          }
          return property === true ? text(key) : "";
        }),
        element.properties["readonly"] === true || stringProperty(element.properties["readonly"]) ? text(dependencies.label("readonly")).toLowerCase() : ""
      ].filter(Boolean);
      const format = rawStringProperty(element.properties["format"]);
      return renderSpecSections([
        { title: dependencies.label("input"), rows: inputRows },
        { title: dependencies.label("constraints"), rows: constraintRows },
        { title: dependencies.label("format"), rows: format ? [dependencies.renderParamSource(format)] : [] }
      ]);
    },

    renderRequiredSpec(element) {
      const requiredWhenRows = element.inputRules.flatMap((rule) => {
        if (!isRequiredWhenInputRule(rule)) {
          return [];
        }
        const condition = requiredWhenValue(rule);
        return condition ? [`${dependencies.label("conditionWhenShort")}: ${dependencies.renderParamSource(condition)}`] : [];
      });
      const rows = [
        isRequiredProperty(element.properties["required"]) || element.inputRules.some(isRequiredBooleanInputRule) ? text(dependencies.label("requiredYes")) : requiredWhenRows.length === 0 ? text(dependencies.label("requiredNo")) : "",
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

function isRequiredProperty(value: string | true | undefined): boolean {
  return value === true || rawStringProperty(value)?.toLowerCase() === "true";
}

function isRequiredInputRule(rule: ParsedElement["inputRules"][number]): boolean {
  return rule.key.trim().toLowerCase() === "required" || isRequiredWhenInputRule(rule);
}

function isRequiredBooleanInputRule(rule: ParsedElement["inputRules"][number]): boolean {
  return rule.key.trim().toLowerCase() === "required" && (!rule.value || rule.value.trim().toLowerCase() === "true");
}

function isRequiredWhenInputRule(rule: ParsedElement["inputRules"][number]): boolean {
  return rule.key.trim().toLowerCase() === "required when" || rule.key.trim().toLowerCase().startsWith("required when ");
}

function requiredWhenValue(rule: ParsedElement["inputRules"][number]): string {
  const key = rule.key.trim();
  if (key.toLowerCase() === "required when") {
    return rule.value.trim();
  }
  return key.slice("required when".length).trim();
}
