import { opaqueExpressionBody } from "./ids.js";

const collectionPathLeafs = new Set(["items", "list", "rows"]);

export interface ModelPathAliasOptions {
  stripCollectionSuffix?: boolean;
}

export function sourcePathKey(source: string): string {
  return opaqueExpressionBody(source) ?? source;
}

export function aliasForModelPath(path: string, options: ModelPathAliasOptions = {}): string {
  const normalizedPath = sourcePathKey(path);
  const parts = normalizedPath.split(".").filter(Boolean);
  if (parts.length < 2) {
    return normalizedPath;
  }

  const last = parts[parts.length - 1];
  const baseIndex = isCollectionPathLeaf(last) ? parts.length - 2 : parts.length - 1;
  const base = isCollectionPathLeaf(last) ? parts[baseIndex] : last;
  const prefix = parts.slice(0, baseIndex).join(".");
  const alias = singularizeModelToken(base, options);
  return prefix ? `${prefix}.${alias}` : alias;
}

export function isCollectionModelSamplePath(path: string): boolean {
  const last = sourcePathKey(path).split(".").filter(Boolean).at(-1);
  return isCollectionPathLeaf(last);
}

export function singularizeModelToken(value: string, options: ModelPathAliasOptions = {}): string {
  if (options.stripCollectionSuffix) {
    const withoutCollectionSuffix = value.replace(/(?:List|Items|Rows)$/u, "");
    if (withoutCollectionSuffix !== value && withoutCollectionSuffix) {
      return withoutCollectionSuffix.charAt(0).toLowerCase() + withoutCollectionSuffix.slice(1);
    }
  }
  if (value.endsWith("ies")) {
    return `${value.slice(0, -3)}y`;
  }
  if (value.endsWith("s") && value.length > 1) {
    return value.slice(0, -1);
  }
  return value;
}

function isCollectionPathLeaf(value: string | undefined): boolean {
  return value !== undefined && collectionPathLeafs.has(value);
}
