import type { BlockAst, SectionAst, SectionKind } from "./markdown-section-ast.js";
import { addAccumulatedSectionProperty } from "./section-property-accumulator.js";
import type {
  MarkVSpecSectionProse,
  MarkVSpecValidationRule,
  SourceLocation
} from "./types.js";

export interface ValidationSectionListItem {
  text: string;
  depth: number;
  range?: { start: { line: number } };
}

export interface ValidationSectionParsedBullet {
  text: string;
  indent: number;
  location: SourceLocation;
}

export interface ValidationSectionDependency {
  source: { type: "entity"; id: string };
  target: { type: "entity"; id: string };
  direction: "source-invalidates-target";
  kind: "references";
}

export interface ValidationSectionSemanticSupport {
  appendEntityProseLines(entity: { overview?: string[]; notes?: string[] }, block: BlockAst, hasStructuredContent: boolean): void;
  isEntityNoteBlock(block: BlockAst): boolean;
  isSectionNotesHeading(block: BlockAst): boolean;
  listItems(blocks: BlockAst[]): ValidationSectionListItem[];
  parsedBulletFromListItem(item: ValidationSectionListItem): ValidationSectionParsedBullet;
  proseForSection(section: SectionAst, overviewBlocks: BlockAst[], noteBlocks: BlockAst[], renderKeys: string[]): MarkVSpecSectionProse[];
  splitKeyValue(text: string): [string, string | undefined];
}

export interface ValidationSectionSemanticResult {
  validations: MarkVSpecValidationRule[];
  sectionProse: MarkVSpecSectionProse[];
  dependencies: ValidationSectionDependency[];
}

export function parseValidationsSection(
  section: SectionAst,
  support: ValidationSectionSemanticSupport
): ValidationSectionSemanticResult {
  const validations: MarkVSpecValidationRule[] = [];
  const dependencies: ValidationSectionDependency[] = [];
  const sectionScope = validationScopeForSection(section.kind);
  let current: MarkVSpecValidationRule | undefined;
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
      const match = /^(?:(?<marker>\S+?):)?(?<id>V-[\p{L}\p{N}-]+)(?:\s+(?<name>.+?))?\s*$/u.exec(block.text);
      if (!match) {
        current = undefined;
        currentHasStructuredContent = false;
        continue;
      }
      const id = match.groups?.id ?? block.text.split(/\s+/u)[0] ?? block.text;
      const marker = match.groups?.marker;
      const location = locationFromBlock(block);
      current = {
        id,
        name: match.groups?.name,
        bullets: [],
        rules: [],
        properties: {
          ...(marker ? { marker } : {}),
          ...(sectionScope ? { scope: sectionScope } : {}),
          ...(sectionScope ? { run: "client" } : {})
        },
        propertyLocations: {
          ...(marker ? { marker: [location] } : {}),
          ...(sectionScope ? { scope: [location], run: [location] } : {})
        },
        location
      };
      validations.push(current);
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
    let activeStructuredKey: string | undefined;
    let activeRule: MarkVSpecValidationRule["rules"][number] | undefined;
    for (const item of support.listItems([block])) {
      const bullet = support.parsedBulletFromListItem(item);
      if (item.depth === 0) {
        activeRule = undefined;
        const [key] = support.splitKeyValue(bullet.text);
        activeStructuredKey = key.trim();
        applyValidationBullet(current, bullet.text, bullet.location, support);
        continue;
      }

      if (activeStructuredKey === "rules" || activeStructuredKey === "constraints") {
        if (item.depth === 1) {
          const [namePart, valuePart] = support.splitKeyValue(bullet.text);
          const name = namePart.trim();
          const targets = valuePart?.trim() ? [valuePart.trim()] : [];
          activeRule = {
            name,
            targets,
            location: bullet.location,
            raw: bullet.text
          };
          current.rules.push(activeRule);
        } else if (activeRule) {
          const [childKey, childValue] = support.splitKeyValue(bullet.text);
          if (childKey.trim() === "message" && childValue !== undefined) {
            addAccumulatedSectionProperty(current, "message", childValue.trim(), bullet.location);
          } else if (childKey.trim() === "messages" && childValue !== undefined) {
            addAccumulatedSectionProperty(current, "message", childValue.trim(), bullet.location);
          } else {
            activeRule.targets.push(bullet.text.trim());
          }
        }
      } else if (activeStructuredKey === "inputs") {
        if (item.depth === 1) {
          addAccumulatedSectionProperty(current, "input", bullet.text.trim(), bullet.location);
        }
      } else if (item.depth === 1 && activeStructuredKey === "messages") {
        addAccumulatedSectionProperty(current, "message", bullet.text.trim(), bullet.location);
      } else if (item.depth === 1 && activeStructuredKey === "message") {
        addAccumulatedSectionProperty(current, "message", bullet.text.trim(), bullet.location);
      } else if (item.depth === 1 && activeStructuredKey === "target") {
        addAccumulatedSectionProperty(current, "target", bullet.text.trim(), bullet.location);
      } else if (item.depth === 1 && activeStructuredKey === "check") {
        const [childKey, childValue] = support.splitKeyValue(bullet.text);
        if (childKey.trim() === "message" && childValue !== undefined) {
          addAccumulatedSectionProperty(current, "message", childValue.trim(), bullet.location);
        } else if (activeRule) {
          activeRule.targets.push(bullet.text.trim());
        }
      }
    }
    const targets = propertyValues(current.properties["target"]);
    for (const target of targets) {
      dependencies.push({
        source: { type: "entity", id: current.id },
        target: { type: "entity", id: target },
        direction: "source-invalidates-target",
        kind: "references"
      });
    }
  }
  return {
    validations,
    sectionProse: support.proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, ["validations:list", ...validations.map((validation) => validationRenderKey(validation.id))]),
    dependencies
  };
}

function validationScopeForSection(kind: SectionKind): "field" | "cross-field" | undefined {
  if (kind === "FieldValidations") {
    return "field";
  }
  if (kind === "CrossFieldValidations") {
    return "cross-field";
  }
  return undefined;
}

function validationRenderKey(validationId: string): string {
  return `validation:${validationId}`;
}

function applyValidationBullet(
  validation: MarkVSpecValidationRule,
  text: string,
  location: SourceLocation,
  support: ValidationSectionSemanticSupport
): void {
  validation.bullets.push({ text, location });
  const [key, value] = support.splitKeyValue(text);
  if (value === undefined) {
    return;
  }

  const normalizedKey = key.trim();
  const normalizedValue = value.trim();
  addAccumulatedSectionProperty(validation, normalizedKey, normalizedValue, location);
}

function propertyValues(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
}

function locationFromBlock(block: BlockAst): SourceLocation {
  return { line: block.range?.start.line ?? 1 };
}
