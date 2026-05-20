import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const validKinds = new Set(["screen", "template", "partial"]);
const validDocGroups = new Set(["guide", "reference", "recipes"]);
const validDocKeys = {
  guide: new Set(["markdown-model", "states", "layout", "elements", "actions", "validation", "scenarios", "partial-updates"]),
  reference: new Set(["file-format", "sections", "elements", "actions", "validations", "rules", "ids", "cli", "limitations"]),
  recipes: new Set(["login-form", "loading-error", "server-partial-update", "pdf-export"])
};

export function loadExampleCatalog(root) {
  const catalogPath = join(root, "examples", "catalog.yml");
  const content = readFileSync(catalogPath, "utf8");
  return {
    path: catalogPath,
    examples: parseCatalog(content)
  };
}

export function validateExampleCatalog(catalog, { root, exampleFiles = [] } = {}) {
  const errors = [];
  const warnings = [];
  const fallbackWarnings = new Set();
  const seenPaths = new Set();
  const catalogPaths = new Set();
  const exampleFileSet = new Set(exampleFiles.map((filePath) => relativeRepositoryPath(root, filePath)));

  for (const [index, entry] of catalog.examples.entries()) {
    const label = entry.path || `entry ${index + 1}`;
    for (const field of ["path", "title", "kind", "stage", "summary", "showcase", "learningPath", "teaches"]) {
      if (entry[field] === undefined) {
        errors.push(`${label}: missing required field '${field}'.`);
      }
    }

    if (entry.path) {
      catalogPaths.add(entry.path);
      if (seenPaths.has(entry.path)) {
        errors.push(`${entry.path}: duplicate catalog path.`);
      }
      seenPaths.add(entry.path);
      if (!existsSync(join(root, entry.path))) {
        errors.push(`${entry.path}: source file does not exist.`);
      }
      if (exampleFileSet.size > 0 && !exampleFileSet.has(entry.path)) {
        errors.push(`${entry.path}: catalog path is not in collected examples.`);
      }
    }

    if (entry.kind && !validKinds.has(entry.kind)) {
      errors.push(`${label}: invalid kind '${entry.kind}'.`);
    }

    for (const field of ["showcase", "learningPath"]) {
      if (entry[field] !== undefined && typeof entry[field] !== "boolean") {
        errors.push(`${label}: ${field} must be a boolean.`);
      }
    }

    if (!Array.isArray(entry.teaches) || entry.teaches.length === 0) {
      errors.push(`${label}: teaches must be a non-empty list.`);
    }

    if (entry.docs !== undefined) {
      if (!entry.docs || typeof entry.docs !== "object" || Array.isArray(entry.docs)) {
        errors.push(`${label}: docs must be an object when present.`);
      } else {
      for (const [group, keys] of Object.entries(entry.docs)) {
        if (!validDocGroups.has(group)) {
          errors.push(`${label}: invalid docs group '${group}'.`);
          continue;
        }
        if (!Array.isArray(keys)) {
          errors.push(`${label}: docs.${group} must be a list.`);
          continue;
        }
        for (const key of keys) {
          if (!validDocKeys[group].has(key)) {
            errors.push(`${label}: docs.${group} key '${key}' is not a known document key.`);
            continue;
          }
          for (const lang of ["ja", "en"]) {
            const resolved = resolveDocKey(root, lang, group, key);
            if (!resolved) {
              errors.push(`${label}: docs.${group} key '${key}' cannot resolve for ${lang}.`);
            } else if (resolved.fallback) {
              fallbackWarnings.add(`docs.${group} key '${key}' falls back to ${lang} ${group}/index.md.`);
            }
          }
        }
      }
      }
    }

    if (entry.next !== undefined) {
      if (!Array.isArray(entry.next)) {
        errors.push(`${label}: next must be a list when present.`);
      } else {
      for (const nextPath of entry.next) {
        if (!existsSync(join(root, nextPath))) {
          errors.push(`${label}: next path '${nextPath}' does not exist.`);
        }
      }
      }
    }
  }

  if (exampleFileSet.size > 0) {
    for (const examplePath of exampleFileSet) {
      if (!catalogPaths.has(examplePath)) {
        errors.push(`${examplePath}: missing from examples/catalog.yml.`);
      }
    }
  }

  warnings.push(...fallbackWarnings);
  return { errors, warnings };
}

export function resolveDocKey(root, lang, group, key) {
  const specificPath = join(root, "docs", lang, group, `${key}.md`);
  if (existsSync(specificPath)) {
    return { path: specificPath, fallback: false };
  }

  const indexPath = join(root, "docs", lang, group, "index.md");
  if (existsSync(indexPath)) {
    return { path: indexPath, fallback: true };
  }

  return undefined;
}

function parseCatalog(content) {
  const examples = [];
  let current;
  let currentList;
  let currentDocGroup;

  for (const rawLine of content.split(/\r?\n/u)) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) {
      continue;
    }

    const indent = rawLine.match(/^ */u)?.[0].length ?? 0;
    const line = rawLine.trim();
    if (line === "examples:") {
      continue;
    }

    if (indent === 2 && line.startsWith("- ")) {
      current = { docs: {} };
      examples.push(current);
      currentList = undefined;
      currentDocGroup = undefined;
      const scalar = line.slice(2);
      if (scalar) {
        assignScalar(current, scalar);
      }
      continue;
    }

    if (!current) {
      throw new Error(`Invalid catalog line before first example: ${rawLine}`);
    }

    if (indent === 4) {
      currentDocGroup = undefined;
      if (line === "teaches:") {
        current.teaches = [];
        currentList = current.teaches;
        continue;
      }
      if (line === "next:") {
        current.next = [];
        currentList = current.next;
        continue;
      }
      if (line === "docs:") {
        current.docs = {};
        currentList = undefined;
        continue;
      }
      if (line.startsWith("docs:")) {
        throw new Error("docs must be an object block; use 'docs:' with nested groups.");
      }
      currentList = undefined;
      assignScalar(current, line);
      continue;
    }

    if (indent === 6) {
      if (line.startsWith("- ")) {
        if (!currentList) {
          throw new Error(`List item without active list: ${rawLine}`);
        }
        currentList.push(parseValue(line.slice(2)));
        continue;
      }

      const [key, value] = splitKeyValue(line);
      if (!validDocGroups.has(key)) {
        throw new Error(`Unknown docs group '${key}' in catalog.`);
      }
      if (value && value !== "[]") {
        throw new Error(`docs.${key} must be a block list or [] shorthand.`);
      }
      current.docs[key] = [];
      currentDocGroup = key;
      currentList = current.docs[key];
      continue;
    }

    if (indent === 8 && line.startsWith("- ")) {
      if (!currentDocGroup || !currentList) {
        throw new Error(`Docs list item without active docs group: ${rawLine}`);
      }
      currentList.push(parseValue(line.slice(2)));
      continue;
    }

    throw new Error(`Unsupported catalog line: ${rawLine}`);
  }

  return examples;
}

function assignScalar(target, line) {
  const [key, value] = splitKeyValue(line);
  target[key] = parseValue(value);
}

function splitKeyValue(line) {
  const separator = line.indexOf(":");
  if (separator === -1) {
    throw new Error(`Expected key/value line: ${line}`);
  }
  return [line.slice(0, separator), line.slice(separator + 1).trim()];
}

function parseValue(value) {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (value === "[]") {
    return [];
  }
  return value.replace(/^["']|["']$/gu, "");
}

function relativeRepositoryPath(root, filePath) {
  return filePath.startsWith(root)
    ? filePath.slice(root.length + 1).split(/[\\/]/u).join("/")
    : filePath.split(/[\\/]/u).join("/");
}
