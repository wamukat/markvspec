import assert from "node:assert/strict";
import test from "node:test";
import { buildMarkVSpecProcessStepReadModel, parseMarkVSpec } from "./index.js";

test("keeps each HttpRequest detail on its own process step", () => {
  const source = `---
id: SCR-MULTI-REQUEST
type: screen
title: Multi Request
---

# SCR-MULTI-REQUEST Multi Request

## Actions

### A-NextPage Next page

- Triggered
  - E-NextPageButton.click
- From
  - idle
- Process: PreparePage
  - Effects
    - view: \${view.selectedTab} = users
- Process: HttpRequest
  - GET /users
    - page: \${model.requestedPage}
- Process: HttpRequest
  - GET /roles
    - userId: \${model.userId}
`;
  const result = parseMarkVSpec(source);
  const action = result.actions[0];

  assert.deepEqual(action?.processSteps.map((step) => [step.name, step.details.map((detail) => [detail.key, detail.value])]), [
    ["PreparePage", []],
    ["HttpRequest", [["request", "GET /users"], ["page", "${model.requestedPage}"]]],
    ["HttpRequest", [["request", "GET /roles"], ["userId", "${model.userId}"]]]
  ]);
});

test("builds typed read models for action process steps without changing detail compatibility", () => {
  const source = `---
id: SCR-PROCESS-READ-MODEL
type: screen
title: Process Read Model
---

# SCR-PROCESS-READ-MODEL Process Read Model

## States

- loading*
- idle
- load-error

## Layout: mobile

### L-ProfilePanel Profile Panel

- stack

## Elements

### E-EmailInput Input

- label: Email

## Actions

### A-InitialLoad Initial load

- Triggered
  - screen.load
- From
  - loading
- Process: Validate
  - validate: V-Email.result
- Process: HttpRequest
  - GET /profile
    - email: E-EmailInput.value
- Process: ServerCall
  - group: initial-load
  - ProfileService.load()
  - params:
    - memberId: \${model.memberId}
  - case: success
    - response: 200 profile
    - Effects
      - update:
        - target: L-ProfilePanel
        - mode: replace
      - continue
- Process: Resolve
  - group: initial-load
  - case: ready
    - response: all data ready
    - Effects
      - state: idle
    - stop
`;
  const result = parseMarkVSpec(source);
  const action = result.actions[0];
  const [validate, request, server, resolveStep] = action?.processSteps ?? [];

  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.message.includes("references missing validation")), true);
  assert.deepEqual(validate?.details.map((detail) => [detail.key, detail.value]), [["validation", "V-Email.result"]]);
  assert.deepEqual(request?.details.map((detail) => [detail.key, detail.value]), [["request", "GET /profile"], ["email", "E-EmailInput.value"]]);
  assert.deepEqual(server?.details.map((detail) => [detail.key, detail.value]), [["call", "ProfileService.load()"], ["params", ""], ["memberId", "${model.memberId}"]]);

  const validateReadModel = validate ? buildMarkVSpecProcessStepReadModel(validate) : undefined;
  const requestReadModel = request ? buildMarkVSpecProcessStepReadModel(request) : undefined;
  const serverReadModel = server ? buildMarkVSpecProcessStepReadModel(server) : undefined;
  const resolveReadModel = resolveStep ? buildMarkVSpecProcessStepReadModel(resolveStep) : undefined;

  assert.equal(validateReadModel?.kind, "Validate");
  assert.deepEqual(validateReadModel?.execution.validations.map((detail) => detail.value), ["V-Email.result"]);
  assert.equal(requestReadModel?.kind, "HttpRequest");
  assert.equal(requestReadModel?.execution.request?.value, "GET /profile");
  assert.deepEqual(requestReadModel?.execution.params.map((detail) => [detail.key, detail.value]), [["email", "E-EmailInput.value"]]);
  assert.equal(serverReadModel?.kind, "ServerCall");
  assert.equal(serverReadModel?.execution.call?.value, "ProfileService.load()");
  assert.deepEqual(serverReadModel?.execution.params.map((detail) => [detail.key, detail.value]), [["memberId", "${model.memberId}"]]);
  assert.deepEqual(serverReadModel?.effects.responses, [{ result: "success", definition: "200 profile", location: { line: lineNumber(source, "    - response: 200 profile") } }]);
  assert.deepEqual(serverReadModel?.effects.outcomes[0]?.update, { target: "L-ProfilePanel", mode: "replace", fragment: undefined, content: undefined });
  assert.equal(resolveReadModel?.kind, "Resolve");
  assert.equal(resolveReadModel?.execution.resolveGroup, "initial-load");
  assert.equal(resolveReadModel?.effects.responses[0]?.definition, "all data ready");
  assert.equal(resolveReadModel?.effects.outcomes[0]?.state, "idle");
});

test("keeps ServerCall params scoped in the action process read model", () => {
  const source = `---
id: SCR-PROCESS-PARAM-SCOPE
type: screen
title: Process Param Scope
---

# SCR-PROCESS-PARAM-SCOPE Process Param Scope

## Actions

### A-Load Load

- Triggered
  - screen.load
- From
  - idle
- Process: ServerCall
  - UserService.load()
  - params:
    - userId: E-User.value
  - retry: 3
- Process: ServerCall
  - params:
    - userId: E-User.value
`;
  const result = parseMarkVSpec(source);
  const [server, missingCall] = result.actions[0]?.processSteps ?? [];
  const serverReadModel = server ? buildMarkVSpecProcessStepReadModel(server) : undefined;
  const missingCallReadModel = missingCall ? buildMarkVSpecProcessStepReadModel(missingCall) : undefined;

  assert.deepEqual(server?.details.map((detail) => [detail.key, detail.value, detail.scope]), [
    ["call", "UserService.load()", undefined],
    ["params", "", undefined],
    ["userId", "E-User.value", "params"],
    ["retry", "3", undefined]
  ]);
  assert.deepEqual(serverReadModel?.execution.params.map((detail) => [detail.key, detail.value]), [["userId", "E-User.value"]]);
  assert.deepEqual(serverReadModel?.execution.customDetails.map((detail) => [detail.key, detail.value]), [["retry", "3"]]);
  assert.equal(serverReadModel?.execution.call?.value, "UserService.load()");
  assert.equal(missingCallReadModel?.execution.call, undefined);
  assert.deepEqual(missingCallReadModel?.execution.params.map((detail) => [detail.key, detail.value]), [["userId", "E-User.value"]]);
});

test("validates scoped ServerCall params through the action process read model", () => {
  const source = `---
id: SCR-SERVER-PARAM-VALIDATION
type: screen
title: Server Param Validation
---

# SCR-SERVER-PARAM-VALIDATION Server Param Validation

## Actions

### A-Load Load

- Triggered
  - screen.load
- From
  - idle
- Process: ServerCall
  - UserService.load()
  - params:
    - userId: E-Missing.value
`;
  const result = parseMarkVSpec(source);

  assert(result.diagnostics.some((diagnostic) =>
    diagnostic.message === "Action A-Load process step ServerCall parameter userId references missing source E-Missing."
      && diagnostic.line === lineNumber(source, "    - userId: E-Missing.value")
  ));
});
function lineNumber(source: string, needle: string, occurrence = 1): number {
  let matches = 0;
  const index = source.split(/\r?\n/).findIndex((line) => {
    if (line !== needle) {
      return false;
    }

    matches += 1;
    return matches === occurrence;
  });
  assert.notEqual(index, -1);
  return index + 1;
}
