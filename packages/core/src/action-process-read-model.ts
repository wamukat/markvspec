import type {
  MarkVSpecProcessStep,
  MarkVSpecProcessStepDetail,
  MarkVSpecProcessStepKind,
  MarkVSpecProcessStepReadModel
} from "./types.js";

const httpRequestNames = new Set(["httprequest", "http request"]);
const serverCallNames = new Set(["servercall", "server call"]);
const partialRequestNames = new Set(["partialrequest", "partial request"]);

export function classifyMarkVSpecProcessStep(step: Pick<MarkVSpecProcessStep, "name">): MarkVSpecProcessStepKind {
  const normalized = normalizeProcessName(step.name);
  if (httpRequestNames.has(normalized)) {
    return "HttpRequest";
  }
  if (serverCallNames.has(normalized)) {
    return "ServerCall";
  }
  if (normalized === "validate") {
    return "Validate";
  }
  if (normalized === "resolve" || normalized.startsWith("resolve ")) {
    return "Resolve";
  }
  if (partialRequestNames.has(normalized)) {
    return "PartialRequest";
  }
  if (normalized === "immediate") {
    return "Immediate";
  }
  return "Generic";
}

export function isMarkVSpecProcessStepKind(
  step: Pick<MarkVSpecProcessStep, "name">,
  kind: MarkVSpecProcessStepKind
): boolean {
  return classifyMarkVSpecProcessStep(step) === kind;
}

export function buildMarkVSpecProcessStepReadModel(step: MarkVSpecProcessStep): MarkVSpecProcessStepReadModel {
  const kind = classifyMarkVSpecProcessStep(step);
  return {
    step,
    kind,
    execution: {
      kind,
      request: processRequestDetail(step, kind),
      call: processCallDetail(step, kind),
      params: processParamDetails(step, kind),
      validations: step.details.filter((detail) => detail.key === "validation" || detail.key === "validate"),
      errorCodes: step.details.filter((detail) => detail.key === "error code" || detail.key === "error codes"),
      resolveGroup: step.resolveGroup,
      customDetails: processCustomDetails(step, kind)
    },
    effects: {
      state: step.propertyLocations["state"]?.length ? step.to : undefined,
      navigate: step.propertyLocations["navigate"]?.length ? step.to : undefined,
      update: step.target || step.mode || step.fragment || step.content
        ? {
            target: step.target,
            mode: step.mode,
            fragment: step.fragment,
            content: step.content
          }
        : undefined,
      display: step.display,
      responses: step.outcomes.flatMap((outcome) => outcome.response
        ? [{ result: outcome.result, definition: outcome.response.definition, location: outcome.response.location }]
        : []),
      outcomes: step.outcomes.map((outcome) => ({
        result: outcome.result,
        state: outcome.propertyLocations["state"]?.length ? outcome.to : undefined,
        navigate: outcome.propertyLocations["navigate"]?.length ? outcome.to : undefined,
        update: outcome.target || outcome.mode || outcome.fragment || outcome.content
          ? {
              target: outcome.target,
              mode: outcome.mode,
              fragment: outcome.fragment,
              content: outcome.content
            }
          : undefined,
        display: outcome.display,
        response: outcome.response
          ? {
              definition: outcome.response.definition,
              location: outcome.response.location
            }
          : undefined
      }))
    }
  };
}

export function processStepDetail(step: MarkVSpecProcessStep, key: string): MarkVSpecProcessStepDetail | undefined {
  return step.details.find((detail) => detail.key === key);
}

export function processStepDataReferenceDetails(step: MarkVSpecProcessStep): MarkVSpecProcessStepDetail[] {
  return [...step.inputs, ...step.receives];
}

export function isCanonicalProcessParamDetail(step: MarkVSpecProcessStep, detail: MarkVSpecProcessStepDetail): boolean {
  const kind = classifyMarkVSpecProcessStep(step);
  if (kind === "HttpRequest" && detail.key !== "request") {
    return true;
  }
  return detail.scope === "params" || detail.key.includes(".params.");
}

export function processExecutionDetailRoots(step: MarkVSpecProcessStep): { name: string; location: MarkVSpecProcessStepDetail["location"] }[] {
  const details = new Map<string, MarkVSpecProcessStepDetail["location"]>();
  const readModel = buildMarkVSpecProcessStepReadModel(step);

  if (readModel.execution.request) {
    details.set("request", readModel.execution.request.location);
  }

  if (readModel.execution.call || (readModel.kind === "ServerCall" && step.details.length > 0)) {
    details.set("server", readModel.execution.call?.location ?? step.details[0]?.location ?? step.location);
  }

  for (const detail of step.details) {
    const root = processExecutionDetailRoot(detail.key);
    if (!root || root === "params") {
      continue;
    }

    details.set(root, details.get(root) ?? detail.location);
  }

  for (const [key, locations] of Object.entries(step.propertyLocations)) {
    if (!key.startsWith("detail ")) {
      continue;
    }

    const name = key.slice("detail ".length).trim();
    const location = locations[0];
    if (name && location) {
      details.set(name, details.get(name) ?? location);
    }
  }

  return [...details.entries()].map(([name, location]) => ({ name, location }));
}

function processRequestDetail(step: MarkVSpecProcessStep, kind: MarkVSpecProcessStepKind): MarkVSpecProcessStepDetail | undefined {
  if (kind !== "HttpRequest") {
    return undefined;
  }
  return processStepDetail(step, "request");
}

function processCallDetail(step: MarkVSpecProcessStep, kind: MarkVSpecProcessStepKind): MarkVSpecProcessStepDetail | undefined {
  if (kind !== "ServerCall") {
    return undefined;
  }
  return processStepDetail(step, "call");
}

function processParamDetails(step: MarkVSpecProcessStep, kind: MarkVSpecProcessStepKind): MarkVSpecProcessStepDetail[] {
  if (kind === "HttpRequest") {
    return step.details.filter((detail) => detail.key !== "request");
  }

  const params: MarkVSpecProcessStepDetail[] = [];
  let inParamsBlock = false;
  for (const detail of step.details) {
    if (detail.key === "params" && detail.value === "") {
      inParamsBlock = true;
      continue;
    }
    if (detail.key.includes(".params.")) {
      params.push(detail);
      continue;
    }
    if (detail.scope === "params" || (inParamsBlock && detail.key.includes(".params.") && !isExecutionRootDetail(detail.key))) {
      params.push(detail);
    }
  }
  return params;
}

function processCustomDetails(step: MarkVSpecProcessStep, kind: MarkVSpecProcessStepKind): MarkVSpecProcessStepDetail[] {
  const paramDetails = new Set(processParamDetails(step, kind));
  return step.details.filter((detail) => {
    if (kind === "HttpRequest") {
      return false;
    }
    if (kind === "ServerCall" && detail.key === "call") {
      return false;
    }
    if (detail.key === "validation" || detail.key === "validate") {
      return false;
    }
    if (detail.key === "error code" || detail.key === "error codes") {
      return false;
    }
    if (detail.key === "params" && detail.value === "") {
      return false;
    }
    if (paramDetails.has(detail)) {
      return false;
    }
    return true;
  });
}

function isExecutionRootDetail(key: string): boolean {
  const root = key.split(".")[0]?.trim();
  return root === "request" || root === "server" || root === "sync" || root === "call" || root === "response";
}

function processExecutionDetailRoot(key: string): string | undefined {
  const root = key.split(".")[0]?.trim();
  if (!root) {
    return undefined;
  }

  if (["request", "server", "sync", "call"].includes(root)) {
    return root === "call" ? "server" : root;
  }

  if (key.includes(".")) {
    return root;
  }

  return undefined;
}

function normalizeProcessName(name: string): string {
  return name.trim().replace(/\s+/gu, " ").toLowerCase();
}
