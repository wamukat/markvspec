import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { loadExampleCatalog } from '../../../scripts/example-catalog.mjs';

const cwd = process.cwd();
export const repoRoot = existsSync(join(cwd, 'examples', 'catalog.yml'))
  ? cwd
  : resolve(cwd, '..');
export const examplesDir = join(repoRoot, 'examples');
export const githubBlobBaseUrl = 'https://github.com/wamukat/markvspec/blob/main/';

export function getExamples() {
  const files = collectVspecFiles(examplesDir);
  const catalog = loadExampleCatalog(repoRoot);
  const entriesByPath = new Map(catalog.examples.map((entry) => [entry.path, entry]));

  return files.map((filePath) => {
    const repoPath = toPosixPath(relative(repoRoot, filePath));
    const entry = entriesByPath.get(repoPath);
    const source = readFileSync(filePath, 'utf8');
    const metadata = exampleMetadata(source, filePath);
    return {
      filePath,
      repoPath,
      relativeExamplePath: toPosixPath(relative(examplesDir, filePath)),
      slug: basename(filePath, '.vspec.md'),
      source,
      id: metadata.id,
      type: metadata.type,
      title: entry?.title ?? metadata.title,
      route: metadata.route,
      locale: metadata.locale,
      kind: entry?.kind ?? metadata.type ?? 'screen',
      stage: entry?.stage ?? 'examples',
      stageLabel: stageLabel(entry?.stage ?? 'examples'),
      summary: entry?.summary ?? 'Compare the MarkVSpec source with the generated preview.',
      teaches: entry?.teaches ?? [],
      learningPath: Boolean(entry?.learningPath),
      docs: entry?.docs ?? {},
      next: entry?.next ?? [],
    };
  });
}

export function getLearningPath(examples) {
  const byRepoPath = new Map(examples.map((example) => [example.repoPath, example]));
  const learning = examples.filter((example) => example.learningPath);
  const learningPaths = new Set(learning.map((example) => example.repoPath));
  const pointedTo = new Set();
  for (const example of learning) {
    for (const nextPath of example.next) {
      if (learningPaths.has(nextPath)) {
        pointedTo.add(nextPath);
      }
    }
  }

  const ordered = [];
  const visited = new Set();
  const starts = learning.filter((example) => !pointedTo.has(example.repoPath));
  for (const start of starts) {
    let current = start;
    while (current && !visited.has(current.repoPath)) {
      ordered.push(current);
      visited.add(current.repoPath);
      const nextPath = current.next.find((path) => learningPaths.has(path) && !visited.has(path));
      current = nextPath ? byRepoPath.get(nextPath) : undefined;
    }
  }

  for (const example of learning) {
    if (!visited.has(example.repoPath)) {
      ordered.push(example);
    }
  }
  return ordered;
}

export function groupExamplesByStage(examples) {
  const groups = new Map();
  for (const example of examples) {
    const group = groups.get(example.stageLabel) ?? [];
    group.push(example);
    groups.set(example.stageLabel, group);
  }
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

export function groupExamplesByKind(examples) {
  const groups = new Map();
  for (const example of examples) {
    const group = groups.get(example.kind) ?? [];
    group.push(example);
    groups.set(example.kind, group);
  }
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

export function relatedDocs(example) {
  const links = [];
  for (const [group, keys] of Object.entries(example.docs)) {
    for (const key of keys) {
      for (const lang of ['en', 'ja']) {
        links.push({
          href: `/${lang}/${group}/${key}/`,
          label: `${lang === 'ja' ? 'Japanese' : 'English'}: ${titleize(group)} / ${titleize(key)}`,
        });
      }
    }
  }
  return links;
}

export function nextExamples(example, examples) {
  const byRepoPath = new Map(examples.map((item) => [item.repoPath, item]));
  return example.next.map((repoPath) => byRepoPath.get(repoPath)).filter(Boolean);
}

export function sourceLines(source) {
  return source.split(/\r?\n/u).map((line, index) => ({
    number: index + 1,
    text: line,
  }));
}

function collectVspecFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectVspecFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.vspec.md')) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function exampleMetadata(markdown, filePath) {
  return {
    id: frontMatterValue(markdown, 'id'),
    type: frontMatterValue(markdown, 'type'),
    title: frontMatterValue(markdown, 'title') || frontMatterValue(markdown, 'id') || basename(filePath, '.vspec.md'),
    route: frontMatterValue(markdown, 'route'),
    locale: frontMatterValue(markdown, 'locale'),
  };
}

function frontMatterValue(markdown, key) {
  const frontMatter = markdown.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? '';
  const line = frontMatter.split(/\r?\n/u).find((item) => item.startsWith(`${key}:`));
  if (!line) {
    return '';
  }
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/gu, '');
}

function stageLabel(value) {
  const labels = new Map([
    ['beginner', 'Beginner'],
    ['form-validation', 'Form And Validation'],
    ['loading-empty-error', 'Loading, Empty, And Error'],
    ['partial-update', 'Partial Updates'],
    ['navigation-overlay', 'Navigation And Overlay UI'],
    ['reuse-template', 'Reuse And Templates'],
    ['responsive-layout', 'Responsive Layout'],
    ['content-display', 'Content And Display Details'],
  ]);
  return labels.get(value) ?? titleize(value);
}

function titleize(value) {
  return value.replaceAll('-', ' ').replace(/\b\w/gu, (match) => match.toUpperCase());
}

function toPosixPath(filePath) {
  return filePath.split(/[\\/]/u).join('/');
}
