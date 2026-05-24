import assert from "node:assert/strict";
import test from "node:test";
import { buildMarkVSpecProcessStepReadModel, parseMarkVSpec } from "../src/index.js";
import { lineNumber } from "./test-helpers.js";

test("keeps each HttpRequest detail on its own process step", () => {
  const source = `---
id: SCR-MULTI-REQUEST
type: screen
title: Multi Request
---

# SCR-MULTI-REQUEST Multi Request

## Elements

### E-NextPageButton Button

- action: A-NextPage

## Actions

### A-NextPage Next page

#### From
- idle
#### P1: Process PreparePage
- view: \${view.selectedTab} = users
#### P2: Process Send request
- request:
  - method: GET
  - path: /users
  - params:
    - page: \${model.requestedPage}
#### P3: Process Send request
- request:
  - method: GET
  - path: /roles
  - params:
    - userId: \${model.userId}
`;
const result = parseMarkVSpec(source);
const action = result.actions[0];

assert.deepEqual(action?.processSteps.map((step) => [step.name, step.details.map((detail) => [detail.key, detail.value])]), [
  ["PreparePage", []],
  ["Send request", [["request.method", "GET"], ["request.path", "/users"], ["request.params.page", "${model.requestedPage}"]]],
  ["Send request", [["request.method", "GET"], ["request.path", "/roles"], ["request.params.userId", "${model.userId}"]]]
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

- before-load+
- loading*
- idle
- load-error

## Layout: mobile

### L-ProfilePanel Profile Panel

- stack

## Elements

### E-EmailInput Input

- label: Email

## Events

- page.load: A-InitialLoad

## Actions

### A-InitialLoad Initial load

#### From
- before-load
- loading
#### P1: Process Check validation
- validate: V-Email.result
#### P2: Process Send request
- request:
  - method: GET
  - path: /profile
  - params:
    - email: E-EmailInput.value
#### P3: Process Call server service
- group: initial-load
- server:
  - ProfileService.load()
  - params:
    - memberId: \${model.memberId}
- case: success
  - response: 200 profile
  - update:
    - target: L-ProfilePanel
    - mode: replace
  - continue
#### P4: Process Resolve responses
- group: initial-load
- case: ready
  - response: all data ready
  - state: idle
  - stop
#### P5: Process Request partial
- request:
  - method: GET
  - path: /profile-panel
- display:
  - partial: PRT-PROFILE-PANEL
#### P6: Process Apply immediate effect
- state: load-error
`;
const result = parseMarkVSpec(source);
const action = result.actions[0];
const [validate, request, server, resolveStep, partialRequest, immediate] = action?.processSteps ?? [];

assert.equal(result.diagnostics.some((diagnostic) => diagnostic.message.includes("references missing validation")), true);
assert.deepEqual(validate?.details.map((detail) => [detail.key, detail.value]), [["validate", "V-Email.result"]]);
assert.deepEqual(request?.details.map((detail) => [detail.key, detail.value]), [["request.method", "GET"], ["request.path", "/profile"], ["request.params.email", "E-EmailInput.value"]]);
assert.deepEqual(server?.details.map((detail) => [detail.key, detail.value]), [["server", "ProfileService.load()"], ["server.params.memberId", "${model.memberId}"]]);

const validateReadModel = validate ? buildMarkVSpecProcessStepReadModel(validate) : undefined;
const requestReadModel = request ? buildMarkVSpecProcessStepReadModel(request) : undefined;
const serverReadModel = server ? buildMarkVSpecProcessStepReadModel(server) : undefined;
const resolveReadModel = resolveStep ? buildMarkVSpecProcessStepReadModel(resolveStep) : undefined;
const partialRequestReadModel = partialRequest ? buildMarkVSpecProcessStepReadModel(partialRequest) : undefined;
const immediateReadModel = immediate ? buildMarkVSpecProcessStepReadModel(immediate) : undefined;

assert.equal(validateReadModel?.kind, "Validate");
assert.deepEqual(validateReadModel?.execution.validations.map((detail) => detail.value), ["V-Email.result"]);
assert.equal(requestReadModel?.kind, "HttpRequest");
assert.equal(requestReadModel?.execution.request?.value, "GET");
assert.deepEqual(requestReadModel?.execution.params.map((detail) => [detail.key, detail.value]), [["request.params.email", "E-EmailInput.value"]]);
assert.equal(serverReadModel?.kind, "ServerCall");
assert.equal(serverReadModel?.execution.call?.value, "ProfileService.load()");
assert.deepEqual(serverReadModel?.execution.params.map((detail) => [detail.key, detail.value]), [["server.params.memberId", "${model.memberId}"]]);
assert.deepEqual(serverReadModel?.effects.responses, [{ result: "success", definition: "200 profile", location: { line: lineNumber(source, "    - response: 200 profile") } }]);
assert.deepEqual(serverReadModel?.effects.outcomes[0]?.update, { target: "L-ProfilePanel", mode: "replace", fragment: undefined, content: undefined });
assert.equal(resolveReadModel?.kind, "Resolve");
assert.equal(resolveReadModel?.execution.resolveGroup, "initial-load");
assert.equal(resolveReadModel?.effects.responses[0]?.definition, "all data ready");
assert.equal(resolveReadModel?.effects.outcomes[0]?.state, "idle");
assert.equal(partialRequestReadModel?.kind, "HttpRequest");
assert.equal(immediateReadModel?.kind, "Immediate");
assert.equal(immediateReadModel?.effects.state, "load-error");
});

test("keeps ServerCall params scoped in the action process read model", () => {
const source = `---
id: SCR-PROCESS-PARAM-SCOPE
type: screen
title: Process Param Scope
---

# SCR-PROCESS-PARAM-SCOPE Process Param Scope

## States

- before-load+

## Events

- page.load: A-Load

## Actions

### A-Load Load

#### From
- before-load
- idle
#### P1: Process Call server service
- server:
  - UserService.load()
  - params:
    - userId: E-User.value
- retry: 3
#### P2: Process Call server service
- server:
  - params:
    - userId: E-User.value
`;
const result = parseMarkVSpec(source);
const [server, missingCall] = result.actions[0]?.processSteps ?? [];
const serverReadModel = server ? buildMarkVSpecProcessStepReadModel(server) : undefined;
const missingCallReadModel = missingCall ? buildMarkVSpecProcessStepReadModel(missingCall) : undefined;

assert.deepEqual(server?.details.map((detail) => [detail.key, detail.value, detail.scope]), [
  ["server", "UserService.load()", undefined],
  ["server.params.userId", "E-User.value", undefined],
  ["retry", "3", undefined]
]);
assert.deepEqual(serverReadModel?.execution.params.map((detail) => [detail.key, detail.value]), [["server.params.userId", "E-User.value"]]);
assert.deepEqual(serverReadModel?.execution.customDetails.map((detail) => [detail.key, detail.value]), [["retry", "3"]]);
assert.equal(serverReadModel?.execution.call?.value, "UserService.load()");
assert.equal(missingCallReadModel?.execution.call, undefined);
assert.deepEqual(missingCallReadModel?.execution.params.map((detail) => [detail.key, detail.value]), [["server.params.userId", "E-User.value"]]);
});

test("validates scoped ServerCall params through the action process read model", () => {
const source = `---
id: SCR-SERVER-PARAM-VALIDATION
type: screen
title: Server Param Validation
---

# SCR-SERVER-PARAM-VALIDATION Server Param Validation

## States

- before-load+

## Events

- page.load: A-Load

## Actions

### A-Load Load

#### From
- before-load
- idle
#### P1: Process Call server service
- server:
  - UserService.load()
  - params:
    - userId: E-Missing.value
`;
const result = parseMarkVSpec(source);

assert(result.diagnostics.some((diagnostic) =>
  diagnostic.message === "Action A-Load process step P1 Call server service parameter server.params.userId references missing source E-Missing."
    && diagnostic.line === lineNumber(source, "      - userId: E-Missing.value")
));
});
