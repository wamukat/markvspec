import {
  businessRuleMessages,
  validationDomainFor,
  validationErrorCodes,
  validationHasRuleProperty,
  validationMessages,
  validationRulePropertyValues as validationDomainRulePropertyValues,
  validationRuleTargets as validationDomainRuleTargets,
  validationTargets as validationDomainTargets
} from "@markvspec/core";
import type { MarkVSpecParseResult, MessageKey } from "@markvspec/core";
import { rawStringProperty, rowspanPrefixCells, text } from "./design-document-renderer.js";
import type { TableCell } from "./design-document-renderer.js";
import { trimNoteLines } from "./markdown-renderer.js";

type ParsedMarkVSpec = MarkVSpecParseResult;
type ParsedValidation = ParsedMarkVSpec["validations"][number];
type ParsedValidationRule = ParsedValidation["rules"][number];
type ParsedBusinessRule = ParsedMarkVSpec["rules"][number];
type ParsedErrorCode = ParsedMarkVSpec["errorCodes"][number];

export interface ValidationRuleSpecRenderingSupport {
  businessRulesAnchor(): string;
  errorCodesAnchor(): string;
  label(result: ParsedMarkVSpec, key: MessageKey): string;
  markerIdHeader(result: ParsedMarkVSpec): string;
  referenceForDetailId(result: ParsedMarkVSpec, id: string): string;
  referenceForId(result: ParsedMarkVSpec, id: string, role?: string): string;
  renderDetailParamSource(result: ParsedMarkVSpec, source: string): string;
  renderEntityNotes(result: ParsedMarkVSpec, lines: string[] | undefined): string;
  renderEntityOverview(result: ParsedMarkVSpec, lines: string[] | undefined): string;
  renderLocalizedTable(result: ParsedMarkVSpec, headers: string[], rows: Array<Array<string | undefined>>): string;
  renderLocalizedTableWithCells(result: ParsedMarkVSpec, headers: string[], rows: TableCell[][]): string;
  renderMarkdownSectionContent(result: ParsedMarkVSpec, lines: string[]): string;
  renderParamSource(result: ParsedMarkVSpec, source: string): string;
  renderSectionNotes(result: ParsedMarkVSpec, sectionProse: ParsedMarkVSpec["sectionProse"]): string;
  renderSectionOverview(result: ParsedMarkVSpec, sectionProse: ParsedMarkVSpec["sectionProse"]): string;
  sectionProseForKind(result: ParsedMarkVSpec, kind: string): ParsedMarkVSpec["sectionProse"];
  validationRulesAnchor(): string;
}

export function createValidationRuleSpecRenderer(support: ValidationRuleSpecRenderingSupport) {
  const renderValidationRulesSpec = (result: ParsedMarkVSpec, markdownResult: ParsedMarkVSpec = result): string => {
    const sectionProse = support.sectionProseForKind(result, "Validations");
    const validationSectionProse = [
      ...sectionProse,
      ...support.sectionProseForKind(result, "FieldValidations"),
      ...support.sectionProseForKind(result, "CrossFieldValidations")
    ];
    const groups: Array<{
      key: "clientFieldValidations" | "clientCrossFieldValidations";
      rules: ParsedMarkVSpec["validations"];
    }> = [
      { key: "clientFieldValidations", rules: [] },
      { key: "clientCrossFieldValidations", rules: [] }
    ];

    for (const validation of result.validations) {
      const domain = validationDomainFor(validation);
      const groupIndex = domain.scope() === "cross-field" ? 1 : 0;
      groups[groupIndex]?.rules.push(validation);
    }
    const content = groups
      .map((group) => group.rules.length > 0
        ? renderValidationRuleGroup(result, support.label(result, group.key), group.key.includes("CrossField") ? "cross-field" : "field", group.rules, markdownResult)
        : "")
      .filter(Boolean)
      .join("");

    return `<section class="doc-section">
    <h2 id="${support.validationRulesAnchor()}">${support.label(result, "validationRules")}</h2>
    ${support.renderSectionOverview(markdownResult, validationSectionProse)}
    ${content || `<p class="spec-empty">${support.label(result, "none")}</p>`}
    ${support.renderSectionNotes(markdownResult, validationSectionProse)}
  </section>`;
  };

  const renderValidationRuleGroup = (
    result: ParsedMarkVSpec,
    heading: string,
    scope: "field" | "cross-field",
    validations: ParsedMarkVSpec["validations"],
    markdownResult: ParsedMarkVSpec = result
  ): string => {
    const showOverview = validations.some((validation) => (validation.overview?.length ?? 0) > 0);
    const showNotes = validations.some((validation) => (validation.notes?.length ?? 0) > 0);
    const headers = scope === "field"
      ? [
        support.markerIdHeader(result),
        ...(showOverview ? [support.label(result, "overview")] : []),
        support.label(result, "target"),
        support.label(result, "rule"),
        support.label(result, "when"),
        support.label(result, "message"),
        support.label(result, "errorCode"),
        ...(showNotes ? [support.label(result, "notes")] : [])
      ]
      : [
        support.markerIdHeader(result),
        ...(showOverview ? [support.label(result, "overview")] : []),
        support.label(result, "target"),
        support.label(result, "inputs"),
        support.label(result, "check"),
        support.label(result, "when"),
        support.label(result, "message"),
        support.label(result, "errorCode"),
        ...(showNotes ? [support.label(result, "notes")] : [])
      ];
    const rows = scope === "field"
      ? renderFieldValidationRows(result, validations, showOverview, showNotes, markdownResult)
      : renderCrossFieldValidationRows(result, validations, showOverview, showNotes, markdownResult);
    return [
      `<h3>${heading}</h3>`,
      support.renderLocalizedTableWithCells(result, headers, rows)
    ].join("");
  };

  const renderFieldValidationRows = (
    result: ParsedMarkVSpec,
    validations: ParsedMarkVSpec["validations"],
    showOverview: boolean,
    showNotes: boolean,
    markdownResult: ParsedMarkVSpec = result
  ): TableCell[][] => {
    return validations.flatMap((validation) => {
      const rules = validation.rules.length > 0 ? validation.rules : [undefined];
      const hasRuleMessages = validationHasRuleProperty(validation, "message");
      const hasRuleErrorCodes = validationHasRuleProperty(validation, "error code");
      const messageValues = hasRuleMessages ? undefined : validationMessages(validation);
      const errorCodeValues = hasRuleErrorCodes ? undefined : validationErrorCodes(validation);

      return rules.map((rule, index) => [
        ...rowspanPrefixCells(index === 0 ? rules.length : 0, [
          support.referenceForDetailId(result, validation.id),
          ...(showOverview ? [support.renderEntityOverview(markdownResult, validation.overview)] : []),
          renderValidationValues(result, validationDomainTargets(validation))
        ]),
        rule ? renderValidationRuleEntry(result, validation, rule) : text("-"),
        renderValidationRuleProperty(result, rule, validation, "when", index)
          || renderLegacyValidationCondition(result, validation),
        renderValidationRuleProperty(result, rule, validation, "message", index, messageValues, !hasRuleMessages),
        renderValidationRuleProperty(result, rule, validation, "error code", index, errorCodeValues, !hasRuleErrorCodes),
        ...rowspanPrefixCells(index === 0 ? rules.length : 0, [
          ...(showNotes ? [support.renderEntityNotes(markdownResult, validation.notes)] : [])
        ])
      ]);
    });
  };

  const renderCrossFieldValidationRows = (
    result: ParsedMarkVSpec,
    validations: ParsedMarkVSpec["validations"],
    showOverview: boolean,
    showNotes: boolean,
    markdownResult: ParsedMarkVSpec = result
  ): TableCell[][] => {
    return validations.map((validation) => [
      support.referenceForDetailId(result, validation.id),
      ...(showOverview ? [support.renderEntityOverview(markdownResult, validation.overview)] : []),
      renderValidationValues(result, validationDomainTargets(validation)),
      renderValidationProperty(result, validation, "input") || renderValidationProperty(result, validation, "inputs"),
      renderValidationProperty(result, validation, "check") || renderValidationRules(result, validation),
      renderValidationProperty(result, validation, "when") || renderLegacyValidationCondition(result, validation),
      renderValidationProperty(result, validation, "message"),
      renderValidationProperty(result, validation, "error code") || renderValidationProperty(result, validation, "error codes"),
      ...(showNotes ? [support.renderEntityNotes(markdownResult, validation.notes)] : [])
    ]);
  };

  const renderValidationRules = (result: ParsedMarkVSpec, validation: ParsedValidation): string => {
    if (validation.rules.length === 0) {
      return "";
    }
    return `<ul class="spec-list">${validation.rules.map((rule) => {
      const targets = validationDomainRuleTargets(rule).length > 0
        ? `: ${validationDomainRuleTargets(rule).map((target) => support.referenceForId(result, target, "target")).join(", ")}`
        : "";
      return `<li>${text(rule.name)}${targets}</li>`;
    }).join("")}</ul>`;
  };

  const renderValidationRuleEntry = (result: ParsedMarkVSpec, validation: ParsedValidation, rule: ParsedValidationRule): string => {
    const targets = validationDomainRuleTargets(rule);
    const ruleText = targets.length > 0
      ? `${text(rule.name)}: ${targets.map((target) => support.referenceForId(result, target, "target")).join(", ")}`
      : text(rule.name);
    const elementMetadata = renderValidationElementShortcutMetadata(result, validation, rule);
    return elementMetadata ? `${ruleText} <span class="mm-muted">(${elementMetadata})</span>` : ruleText;
  };

  const renderValidationRuleProperty = (
    result: ParsedMarkVSpec,
    rule: ParsedValidationRule | undefined,
    validation: ParsedValidation,
    key: "when" | "message" | "error code",
    index: number,
    fallbackValues?: string[],
    useValidationFallback = true
  ): string => {
    const ruleValues = rule ? validationDomainRulePropertyValues(validation, rule, key) : [];
    if (ruleValues.length > 0) {
      return renderValidationValues(result, ruleValues);
    }

    if (fallbackValues && fallbackValues.length > 0) {
      return renderValidationValues(result, fallbackValues.length === validation.rules.length ? [fallbackValues[index] ?? ""] : fallbackValues);
    }

    if (key === "error code" && useValidationFallback) {
      return renderValidationValues(result, validationErrorCodes(validation));
    }
    return useValidationFallback ? renderValidationProperty(result, validation, key) : "";
  };

  const renderValidationElementShortcutMetadata = (
    result: ParsedMarkVSpec,
    validation: ParsedValidation,
    rule: ParsedValidationRule
  ): string => {
    const normalizedName = rule.name.toLowerCase();
    const targets = validationDomainRuleTargets(rule).map((target) => target.toLowerCase());
    if ((normalizedName !== "length" && normalizedName !== "range") || !targets.includes("element")) {
      return "";
    }

    const targetElement = validationPropertyValues(validation, "target")
      .map((target) => result.elements.find((element) => element.id === target))
      .find((element): element is NonNullable<typeof element> => Boolean(element));
    if (!targetElement) {
      return "";
    }

    const metadataKeys = normalizedName === "length"
      ? [
        { label: "min length", keys: ["min length", "min-length", "minlength"] },
        { label: "max length", keys: ["max length", "max-length", "maxlength"] }
      ]
      : [
        { label: "min", keys: ["min"] },
        { label: "max", keys: ["max"] },
        { label: "step", keys: ["step"] }
      ];
    const rows = metadataKeys.flatMap(({ label: metadataLabel, keys }) => {
      const value = elementInputMetadataValue(targetElement, keys);
      return value ? [`${text(metadataLabel)}: ${support.renderParamSource(result, value)}`] : [];
    });
    return rows.join(", ");
  };

  const elementInputMetadataValue = (element: ParsedMarkVSpec["elements"][number], keys: string[]): string => {
    const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
    for (const [propertyKey, property] of Object.entries(element.properties)) {
      if (!normalizedKeys.has(propertyKey.toLowerCase())) {
        continue;
      }
      const propertyValue = rawStringProperty(property);
      if (propertyValue) {
        return propertyValue;
      }
    }
    const inputRule = element.inputRules.find((rule) => normalizedKeys.has(rule.key.toLowerCase()));
    return inputRule?.value ?? "";
  };

  const validationPropertyValues = (validation: ParsedValidation, key: string): string[] => {
    const value = validation.properties[key];
    return Array.isArray(value) ? value : value ? [value] : [];
  };

  const renderValidationProperty = (result: ParsedMarkVSpec, validation: ParsedValidation, key: string): string => {
    const values = validationPropertyValues(validation, key);
    return renderValidationValues(result, values);
  };

  const renderValidationValues = (result: ParsedMarkVSpec, values: string[]): string => {
    const presentValues = values.filter(Boolean);
    if (presentValues.length === 0) {
      return "";
    }

    return presentValues.length === 1
      ? support.renderParamSource(result, presentValues[0] ?? "")
      : `<ul class="spec-list">${presentValues.map((item) => `<li>${support.renderParamSource(result, item)}</li>`).join("")}</ul>`;
  };

  const renderLegacyValidationCondition = (result: ParsedMarkVSpec, validation: ParsedValidation): string => {
    const values = validationPropertyValues(validation, "condition");
    if (values.length === 0) {
      return "";
    }
    return `${text(support.label(result, "legacyCondition"))}: ${renderValidationValues(result, values)}`;
  };

  const renderRulesSpec = (result: ParsedMarkVSpec, markdownResult: ParsedMarkVSpec = result): string => {
    const sectionProse = support.sectionProseForKind(result, "BusinessRules");
    const showOverview = result.rules.some((rule) => (rule.overview?.length ?? 0) > 0);
    const showNotes = result.rules.some((rule) => (rule.notes?.length ?? 0) > 0);
    const showMessages = result.rules.some((rule) => businessRuleMessages(rule).length > 0);
    return `<section class="doc-section">
    <h2 id="${support.businessRulesAnchor()}">${support.label(result, "businessRules")}</h2>
    ${support.renderSectionOverview(markdownResult, sectionProse)}
    ${support.renderLocalizedTable(result,
      [
        support.markerIdHeader(result),
        ...(showOverview ? [support.label(result, "overview")] : []),
        support.label(result, "ruleText"),
        ...(showMessages ? [support.label(result, "message")] : []),
        ...(showNotes ? [support.label(result, "notes")] : [])
      ],
      result.rules.map((rule) => [
        support.referenceForDetailId(result, rule.id),
        ...(showOverview ? [support.renderEntityOverview(markdownResult, rule.overview)] : []),
        renderRuleText(markdownResult, rule),
        ...(showMessages ? [renderBusinessRuleMessages(result, rule)] : []),
        ...(showNotes ? [support.renderEntityNotes(markdownResult, rule.notes)] : [])
      ])
    )}
    ${support.renderSectionNotes(markdownResult, sectionProse)}
  </section>`;
  };

  const renderRuleText = (result: ParsedMarkVSpec, rule: ParsedBusinessRule): string => {
    const descriptions = businessRulePropertyValues(rule, "description");
    if (descriptions.length > 0) {
      return support.renderMarkdownSectionContent(result, descriptions.length === 1 ? [descriptions[0] ?? ""] : descriptions.map((description) => `- ${description}`));
    }

    const bodyLines = trimNoteLines(rule.bodyLines ?? []);
    if (bodyLines.length > 0) {
      return support.renderMarkdownSectionContent(result, bodyLines);
    }

    return rule.bullets.length > 0
      ? support.renderMarkdownSectionContent(result, rule.bullets.map((bullet) => `- ${bullet.text}`))
      : "";
  };

  const renderBusinessRuleMessages = (result: ParsedMarkVSpec, rule: ParsedBusinessRule): string => {
    const values = businessRuleMessages(rule);
    if (values.length === 0) {
      return "";
    }
    return values.length === 1
      ? support.renderParamSource(result, values[0] ?? "")
      : `<ul class="spec-list">${values.map((item) => `<li>${support.renderParamSource(result, item)}</li>`).join("")}</ul>`;
  };

  const businessRulePropertyValues = (rule: ParsedBusinessRule, key: string): string[] => {
    const value = rule.properties[key];
    return Array.isArray(value) ? value : value ? [value] : [];
  };

  const renderErrorCodesSpec = (result: ParsedMarkVSpec, markdownResult: ParsedMarkVSpec = result): string => {
    const sectionProse = support.sectionProseForKind(result, "ErrorCodes");
    const showOverview = result.errorCodes.some((errorCode) => (errorCode.overview?.length ?? 0) > 0);
    const showNotes = result.errorCodes.some((errorCode) => (errorCode.notes?.length ?? 0) > 0);
    return `<section class="doc-section">
    <h2 id="${support.errorCodesAnchor()}">${support.label(result, "errorCodes")}</h2>
    ${support.renderSectionOverview(markdownResult, sectionProse)}
    ${support.renderLocalizedTable(result,
      [
        support.markerIdHeader(result),
        support.label(result, "name"),
        ...(showOverview ? [support.label(result, "overview")] : []),
        support.label(result, "businessRule"),
        support.label(result, "target"),
        support.label(result, "message"),
        support.label(result, "display"),
        ...(showNotes ? [support.label(result, "notes")] : [])
      ],
      result.errorCodes.map((errorCode) => [
        support.referenceForDetailId(result, errorCode.id),
        text(errorCode.name),
        ...(showOverview ? [support.renderEntityOverview(markdownResult, errorCode.overview)] : []),
        renderErrorCodeProperty(result, errorCode, "business rule"),
        renderErrorCodeProperty(result, errorCode, "target"),
        renderErrorCodeProperty(result, errorCode, "message"),
        renderErrorCodeProperty(result, errorCode, "display"),
        ...(showNotes ? [support.renderEntityNotes(markdownResult, errorCode.notes)] : [])
      ])
    )}
    ${support.renderSectionNotes(markdownResult, sectionProse)}
  </section>`;
  };

  const renderErrorCodeProperty = (result: ParsedMarkVSpec, errorCode: ParsedErrorCode, key: string): string => {
    const value = errorCode.properties[key];
    const values = Array.isArray(value) ? value : value ? [value] : [];
    if (values.length === 0) {
      return "";
    }

    return values.length === 1
      ? support.renderDetailParamSource(result, values[0] ?? "")
      : `<ul class="spec-list">${values.map((item) => `<li>${support.renderDetailParamSource(result, item)}</li>`).join("")}</ul>`;
  };

  return {
    renderValidationRulesSpec,
    renderRulesSpec,
    renderErrorCodesSpec
  };
}
