import { elementIdPattern } from "./ids.js";
import type { BlockAst, SectionAst } from "./markdown-section-ast.js";
import { addPropertyLocation } from "./section-property-accumulator.js";
import type {
  MarkVSpecDiagnostic,
  MarkVSpecPreviewScenario,
  MarkVSpecSampleRow,
  MarkVSpecSectionProse,
  SourceLocation
} from "./types.js";

export interface PreviewScenarioListItem {
  text: string;
  depth: number;
  range?: { start: { line: number } };
}

export interface PreviewScenarioParsedBullet {
  text: string;
  indent: number;
  location: SourceLocation;
}

export interface PreviewScenarioSectionSemanticSupport {
  appendEntityProseLines(entity: { overview?: string[]; notes?: string[] }, block: BlockAst, hasStructuredContent: boolean): void;
  isEntityNoteBlock(block: BlockAst): boolean;
  isSectionNotesHeading(block: BlockAst): boolean;
  listItems(blocks: BlockAst[]): PreviewScenarioListItem[];
  parsedBulletFromListItem(item: PreviewScenarioListItem): PreviewScenarioParsedBullet;
  proseForSection(section: SectionAst, overviewBlocks: BlockAst[], noteBlocks: BlockAst[], renderKeys: string[]): MarkVSpecSectionProse[];
  splitKeyValue(text: string): [string, string | undefined];
}

export interface PreviewScenarioSectionSemanticResult {
  previewScenarios: MarkVSpecPreviewScenario[];
  sectionProse: MarkVSpecSectionProse[];
  diagnostics: MarkVSpecDiagnostic[];
}

const elementIdRegexForSamples = new RegExp(String.raw`^${elementIdPattern}$`, "u");

export function parsePreviewScenariosSection(
  section: SectionAst,
  support: PreviewScenarioSectionSemanticSupport
): PreviewScenarioSectionSemanticResult {
  const scenarios: MarkVSpecPreviewScenario[] = [];
  const diagnostics: MarkVSpecDiagnostic[] = [];
  let current: MarkVSpecPreviewScenario | undefined;
  let currentHasStructuredContent = false;
  let hasSeenEntity = false;
  let inSectionNotes = false;
  const sectionOverviewBlocks: BlockAst[] = [];
  const sectionNoteBlocks: BlockAst[] = [];

  for (const block of section.blocks) {
    if (support.isSectionNotesHeading(block)) {
      current = undefined;
      currentHasStructuredContent = false;
      inSectionNotes = true;
      hasSeenEntity = true;
      continue;
    }
    if (inSectionNotes) {
      if (support.isEntityNoteBlock(block)) {
        sectionNoteBlocks.push(block);
      }
      continue;
    }
    if (block.type === "heading" && block.depth === 3) {
      hasSeenEntity = true;
      current = {
        name: block.text.trim(),
        route: [],
        samples: [],
        cases: [],
        properties: {},
        propertyLocations: {},
        location: { line: block.range?.start.line ?? 1 }
      };
      scenarios.push(current);
      currentHasStructuredContent = false;
      continue;
    }
    if (!current) {
      if (!hasSeenEntity && support.isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
      }
      continue;
    }
    if (support.isEntityNoteBlock(block)) {
      support.appendEntityProseLines(current, block, currentHasStructuredContent);
      continue;
    }
    if (block.type !== "list") {
      continue;
    }
    currentHasStructuredContent = true;
    let activeKey: string | undefined;
    let activeSample: MarkVSpecPreviewScenario["samples"][number] | undefined;
    let activeSampleRow: MarkVSpecSampleRow | undefined;
    for (const item of support.listItems([block])) {
      const bullet = support.parsedBulletFromListItem(item);
      const [keyPart, valuePart] = support.splitKeyValue(bullet.text);
      const key = keyPart.trim();
      const value = valuePart?.trim();
      if (bullet.indent === 0) {
        activeSample = undefined;
        activeSampleRow = undefined;
      }
      if (item.depth > 0) {
        if (activeKey === "cases") {
          const caseRef = parsePreviewScenarioCaseReference(bullet.text, bullet.location);
          if (caseRef) {
            current.cases.push(caseRef);
          } else {
            diagnostics.push({
              severity: "warning",
              message: `Preview Scenario ${current.name} has malformed case reference: ${bullet.text}. Use A-ActionId.P-marker.case-name.`,
              line: bullet.location.line
            });
          }
        }
        if (activeKey === "samples") {
          const sampleResult = applyPreviewScenarioSampleBullet(current, bullet, activeSample, activeSampleRow, diagnostics, support);
          if (sampleResult.sample) {
            activeSample = sampleResult.sample;
          }
          if (sampleResult.row) {
            activeSampleRow = sampleResult.row;
          }
        }
        if (activeKey === "route") {
          applyPreviewScenarioRouteBullet(current, bullet, diagnostics, support);
        }
        continue;
      }

      activeKey = key;
      if ((key === "cases" || key === "samples" || key === "route") && (value === undefined || value === "")) {
        continue;
      }
      if (value === undefined) {
        diagnostics.push({
          severity: "warning",
          message: `Preview Scenario ${current.name} has malformed entry: ${bullet.text}. Use state, model, view, route, samples, before, or cases.`,
          line: bullet.location.line
        });
        continue;
      }
      if (key === "route") {
        diagnostics.push({
          severity: "warning",
          message: `Preview Scenario ${current.name} route must be a block with key: value entries.`,
          line: bullet.location.line
        });
        continue;
      }
      current.properties[key] = value;
      addPropertyLocation(current.propertyLocations, key, bullet.location);
      if (key === "state") {
        current.state = value;
      } else if (key === "model") {
        current.model = value;
      } else if (key === "view") {
        current.view = value;
      } else if (key === "before") {
        current.before = value;
      }
    }
  }

  return {
    previewScenarios: scenarios,
    sectionProse: support.proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, ["preview-scenarios"]),
    diagnostics
  };
}

function applyPreviewScenarioRouteBullet(
  scenario: MarkVSpecPreviewScenario,
  bullet: PreviewScenarioParsedBullet,
  diagnostics: MarkVSpecDiagnostic[],
  support: PreviewScenarioSectionSemanticSupport
): void {
  if (bullet.indent !== 1) {
    diagnostics.push({
      severity: "warning",
      message: `Preview Scenario ${scenario.name} route entry must use key: value entries.`,
      line: bullet.location.line
    });
    return;
  }

  const [keyPart, valuePart] = support.splitKeyValue(bullet.text);
  const key = keyPart.trim();
  const value = valuePart?.trim();
  if (!key || value === undefined || value === "") {
    diagnostics.push({
      severity: "warning",
      message: `Preview Scenario ${scenario.name} route entry must use key: value entries.`,
      line: bullet.location.line
    });
    return;
  }

  scenario.route.push({
    key,
    value,
    location: bullet.location
  });
}

function parsePreviewScenarioCaseReference(text: string, location: SourceLocation): MarkVSpecPreviewScenario["cases"][number] | undefined {
  const match = /^(A-[\p{L}\p{N}-]+)\.(P[A-Za-z0-9_-]*)\.([A-Za-z][A-Za-z0-9_-]*)$/u.exec(text.trim());
  if (!match) {
    return undefined;
  }
  return {
    actionId: match[1],
    processMarker: match[2],
    caseName: match[3],
    raw: text,
    location
  };
}

function applyPreviewScenarioSampleBullet(
  scenario: MarkVSpecPreviewScenario,
  bullet: PreviewScenarioParsedBullet,
  activeSample: MarkVSpecPreviewScenario["samples"][number] | undefined,
  activeRow: MarkVSpecSampleRow | undefined,
  diagnostics: MarkVSpecDiagnostic[],
  support: PreviewScenarioSectionSemanticSupport
): { sample?: MarkVSpecPreviewScenario["samples"][number]; row?: MarkVSpecSampleRow } {
  const [keyPart, valuePart] = support.splitKeyValue(bullet.text);
  const key = keyPart.trim();
  const value = valuePart?.trim();

  if (bullet.indent === 1) {
    if (!elementIdRegexForSamples.test(key)) {
      diagnostics.push({
        severity: "warning",
        message: `Preview Scenario ${scenario.name} has malformed sample target: ${bullet.text}. Use E-ElementId or E-ElementId: value.`,
        line: bullet.location.line
      });
      return {};
    }
    const sample: MarkVSpecPreviewScenario["samples"][number] = {
      elementId: key,
      ...(value !== undefined && value !== "" ? { value } : {}),
      location: bullet.location
    };
    scenario.samples.push(sample);
    return { sample };
  }

  if (bullet.indent === 2 && activeSample) {
    if (key === "rows" && value === "[]") {
      activeSample.rows = {
        rows: [],
        explicitEmpty: true,
        location: bullet.location
      };
      return { sample: activeSample };
    }
    if (key === "rows" && (value === undefined || value === "")) {
      activeSample.rows = {
        rows: [],
        explicitEmpty: false,
        location: bullet.location
      };
      return { sample: activeSample };
    }
  }

  if (bullet.indent === 3 && activeSample?.rows) {
    if (key === "row" && (value === undefined || value === "")) {
      const row: MarkVSpecSampleRow = {
        fields: {},
        fieldLocations: {},
        location: bullet.location,
        raw: bullet.text
      };
      activeSample.rows.rows.push(row);
      activeSample.rows.explicitEmpty = false;
      return { sample: activeSample, row };
    }
  }

  if (bullet.indent > 3 && activeSample && activeRow) {
    activeRow.fields[key] = value ?? "";
    addPropertyLocation(activeRow.fieldLocations, key, bullet.location);
    activeRow.raw = `${activeRow.raw}\n${bullet.text}`;
    return { sample: activeSample, row: activeRow };
  }

  diagnostics.push({
    severity: "warning",
    message: `Preview Scenario ${scenario.name} sample entry must use scalar E-* values or rows with row: field entries.`,
    line: bullet.location.line
  });
  return { sample: activeSample, row: activeRow };
}
