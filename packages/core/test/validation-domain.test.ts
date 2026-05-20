import assert from "node:assert/strict";
import test from "node:test";
import {
  businessRuleDomainFor,
  businessRuleMessages,
  businessRuleViolation,
  validationDisplayMessageSource,
  validationDomainFor,
  validationErrorCodes,
  validationHasRuleProperty,
  validationMessages,
  validationRulePropertyValues,
  validationRuleTargets,
  validationRun,
  validationScope,
  validationTargets
} from "../src/validation-domain.js";
import type { MarkVSpecRule, MarkVSpecValidationRule } from "../src/types.js";

test("validation domain classifies run and scope from validation properties", () => {
  assert.equal(validationRun(validation({ run: "server-response" })), "server");
  assert.equal(validationRun(validation({ run: "client" })), "client");
  assert.equal(validationScope(validation({ scope: "composite" })), "cross-field");
  assert.equal(validationScope(validation({ target: ["E-Email", "E-ConfirmEmail"] })), "cross-field");
  assert.equal(validationScope(validation({ target: "F-LoginFields" })), "cross-field");
  assert.equal(validationScope(validation({ target: "E-Email" })), "field");
});

test("validation domain exposes target, message, marker and display message source", () => {
  const item = validation({
    target: ["E-Email", "E-ConfirmEmail"],
    marker: "VAL1",
    message: ["Email is required", "Use letters, numbers, and hyphens."],
    "error code": "required"
  });
  const domain = validationDomainFor(item);

  assert.deepEqual(validationTargets(item), ["E-Email", "E-ConfirmEmail"]);
  assert.deepEqual(domain.targets(), ["E-Email", "E-ConfirmEmail"]);
  assert.deepEqual(validationMessages(item), ["Email is required", "Use letters, numbers, and hyphens."]);
  assert.deepEqual(validationErrorCodes(item), ["required"]);
  assert.deepEqual(validationDisplayMessageSource(item), {
    sourceId: "V-Email",
    messagePath: "messages",
    marker: "VAL1",
    messages: ["Email is required", "Use letters, numbers, and hyphens."]
  });
});

test("validation domain resolves rule targets and rule-level fallback properties", () => {
  const item = validation(
    {
      message: ["Validation default", "Required message"],
      "error code": ["validation-default", "required"]
    },
    [{
      name: "required",
      targets: ["element", "message: Inline message"],
      location: { line: 10 },
      raw: "required"
    }, {
      name: "format",
      targets: ["element"],
      location: { line: 20 },
      raw: "format"
    }]
  );
  item.propertyLocations.message = [{ line: 5 }, { line: 11 }];
  item.propertyLocations["error code"] = [{ line: 6 }, { line: 12 }];

  assert.deepEqual(validationRuleTargets(item.rules[0]!), ["element"]);
  assert.deepEqual(validationRulePropertyValues(item, item.rules[0]!, "message"), ["Required message"]);
  assert.deepEqual(validationRulePropertyValues(item, item.rules[0]!, "error code"), ["required"]);
  assert.equal(validationHasRuleProperty(item, "message"), true);
});

test("validation domain preserves comma-containing prose values as one message", () => {
  const item = validation(
    {
      message: "Use letters, numbers, and hyphens.",
      "error code": "letters,numbers"
    },
    [{
      name: "format",
      targets: ["element"],
      location: { line: 10 },
      raw: "format"
    }]
  );
  item.propertyLocations.message = [{ line: 11 }];
  item.propertyLocations["error code"] = [{ line: 12 }];

  assert.deepEqual(validationMessages(item), ["Use letters, numbers, and hyphens."]);
  assert.deepEqual(validationErrorCodes(item), ["letters,numbers"]);
  assert.deepEqual(validationRulePropertyValues(item, item.rules[0]!, "message"), ["Use letters, numbers, and hyphens."]);
  assert.deepEqual(validationRulePropertyValues(item, item.rules[0]!, "error code"), ["letters,numbers"]);
});

test("business rule domain exposes marker, messages, result and violation case", () => {
  const rule = businessRule({
    marker: "BR1",
    messages: ["Email already exists, choose another address."],
    result: "duplicate-email"
  });
  const domain = businessRuleDomainFor(rule);

  assert.deepEqual(businessRuleMessages(rule), ["Email already exists, choose another address."]);
  assert.equal(domain.marker(), "BR1");
  assert.equal(domain.result(), "duplicate-email");
  assert.deepEqual(businessRuleViolation(rule), {
    caseName: "business-rule-violation",
    result: "duplicate-email",
    marker: "BR1",
    messages: ["Email already exists, choose another address."]
  });
});

function validation(
  properties: Record<string, string | string[]>,
  rules: MarkVSpecValidationRule["rules"] = []
): MarkVSpecValidationRule {
  return {
    id: "V-Email",
    name: "Email",
    bullets: [],
    rules,
    properties,
    propertyLocations: Object.fromEntries(Object.keys(properties).map((key) => [key, [{ line: 1 }]])),
    location: { line: 1 }
  };
}

function businessRule(properties: Record<string, string | string[]>): MarkVSpecRule {
  return {
    id: "R-EmailMustBeUnique",
    name: "Email must be unique",
    bullets: [],
    properties,
    propertyLocations: Object.fromEntries(Object.keys(properties).map((key) => [key, [{ line: 1 }]])),
    location: { line: 1 }
  };
}
