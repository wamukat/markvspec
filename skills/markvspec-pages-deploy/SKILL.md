---
name: markvspec-pages-deploy
description: "Project-specific GitHub Pages workflow for MarkVSpec. Use when changing, debugging, deploying, or validating the MarkVSpec Pages site, static HTML docs, README Pages links, generated example previews, site/docs sources, or Pages link checks."
---

# MarkVSpec Pages Deploy

Use this skill for MarkVSpec GitHub Pages work.

## Directory Model

- `docs/`: Markdown documentation source for GitHub blob viewing.
- `site/`: static HTML source for the Pages site.
- `examples/`: `.vspec.md` example source.
- `_site/`: generated Pages output, ignored by git.

Published URLs intentionally keep `/docs/...` even though static HTML source
lives under `site/docs/...`.

`site/` owns Pages-only HTML. `docs/` should not contain site-owned HTML pages
in the current repository. Always inspect the current tree before moving files;
if a future intentional exception exists, preserve it and document why.

Examples:

- `site/docs/ja/user/authoring-guide.html`
  publishes to `https://wamukat.github.io/markvspec/docs/ja/user/authoring-guide.html`
- `examples/01-basics/hello-screen.vspec.md`
  publishes to `https://wamukat.github.io/markvspec/examples/hello-screen.html`

## Build

Before changing Pages behavior, inspect:

```bash
sed -n '1,240p' scripts/build-github-pages.mjs
find site -type f | sort
find docs -type f -name '*.html' | sort
```

If `docs/` contains site-owned HTML, move it under `site/` unless there is a
deliberate documented exception.

Build locally:

```bash
npm run build -w @markvspec/cli
npm run build:pages
```

Expected output includes:

- `_site/index.html`
- `_site/examples/*.html`
- `_site/docs/**/*.html`
- `_site/docs/assets/*`

## Link Rules

Pages HTML may link to:

- other Pages HTML with relative `.html` links
- Markdown docs via GitHub blob URLs
- generated examples via `/markvspec/examples/*.html`

Decision rules:

- Links to site-owned HTML stay as Pages `.html` links.
- Links to authored Markdown docs become GitHub blob URLs under
  `https://github.com/wamukat/markvspec/blob/main/docs/...`.
- Blob links must not contain `/site/docs/`.
- Generated example links should resolve under `/markvspec/examples/*.html`.
- Asset links should resolve under the generated `_site` tree.

The Pages build rewrites `.md` links in site HTML to:

```text
https://github.com/wamukat/markvspec/blob/main/<path>.md
```

Do not convert all Markdown docs to HTML unless the user explicitly asks. The
current policy is Markdown on GitHub blob, static HTML under Pages.

## Publish Boundary

Default mode is local build and link validation. Commit, push, or deploy only
when the user asks for it or the current task explicitly includes deployment.

Before pushing, confirm the branch, remote, intended diff, and target workflow.
Pages deploy runs on pushes to `main`; after pushing, watch the GitHub Pages
workflow and verify public URLs.

## Required Validation

Run:

```bash
npm run build:pages
git diff --check
npm run check:readme-release
```

Check that expected local files exist:

```bash
test -f _site/docs/en/user/authoring-guide.html
test -f _site/docs/ja/user/authoring-guide.html
test -f _site/examples/hello-screen.html
```

Derive expected `_site` paths from changed `site/**/*.html`, changed README
Pages URLs, and changed example sources. Always smoke-check one English guide
page, one Japanese guide page, and at least one generated example when relevant.

Check links for modified Pages HTML. The checker must validate fragments, local
Pages links, public blob links, and must reject blob URLs containing
`/site/docs/`. Use a script like:

```bash
node <<'EOF'
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = 'https://wamukat.github.io/markvspec/docs/ja/user/authoring-guide.html';
const file = '_site/docs/ja/user/authoring-guide.html';
const html = readFileSync(file, 'utf8');
const links = [...new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))];
let failures = 0;

function fail(message) {
  failures += 1;
  console.log(message);
}

function idsForFile(path) {
  const targetHtml = readFileSync(path, 'utf8');
  return new Set([...targetHtml.matchAll(/\s(?:id|name)="([^"]+)"/g)].map((m) => decodeURIComponent(m[1])));
}

for (const href of links) {
  const url = new URL(href, base);
  if (url.hostname === 'github.com' && url.pathname.includes('/site/docs/')) {
    fail(`bad blob path ${url.href}`);
  }
  if (url.hostname === 'wamukat.github.io' && url.pathname.startsWith('/markvspec/')) {
    const localPath = resolve('_site', url.pathname.replace('/markvspec/', ''));
    if (!existsSync(localPath)) {
      fail(`missing local page ${url.href}`);
      continue;
    }
    if (url.hash) {
      const target = decodeURIComponent(url.hash.slice(1));
      if (!idsForFile(localPath).has(target)) fail(`missing fragment ${url.href}`);
    }
    continue;
  }
  if (url.hostname === 'github.com') {
    let status = 'ERR';
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      status = String(res.status);
    } catch {
      try {
        const res = await fetch(url, { redirect: 'follow' });
        status = String(res.status);
      } catch {}
    }
    if (!status.startsWith('2')) fail(`${status} ${url.href}`);
  }
}
process.exit(failures === 0 ? 0 : 1);
EOF
```

For header or layout changes, inspect at least one English and one Japanese page
in a browser or with `agent-browser`. Check header navigation, in-page anchors,
relative asset paths, and mobile/desktop header behavior.

## Deploy

Pages deploy runs on push to `main`.

After pushing:

```bash
gh run list --repo wamukat/markvspec --workflow "GitHub Pages" --limit 5
gh run watch <run-id> --repo wamukat/markvspec --exit-status
```

Then verify public URLs:

```bash
curl -I -L https://wamukat.github.io/markvspec/
curl -I -L https://wamukat.github.io/markvspec/docs/ja/user/authoring-guide.html
curl -I -L https://wamukat.github.io/markvspec/examples/hello-screen.html
```

For link fixes, run a public link and fragment check against the deployed page
as well as the local `_site` output. At minimum include any reported broken URL
and any Pages URL introduced or changed in README files.

If `actions/configure-pages` fails with `Resource not accessible by integration`
on first deploy, the Pages site likely needs one-time enablement as workflow
source. Use the authenticated admin account:

```bash
gh api -X POST /repos/wamukat/markvspec/pages -f build_type=workflow
```

Only do this when the repository has no Pages site and the user expects Pages to
be enabled.

If public URLs 404 after a successful workflow, inspect artifact root, upload
path, base path `/markvspec/`, and workflow freshness before changing content.

## Final Report

Report:

- commit SHA
- commands run and pass/fail results
- Pages workflow run ID or URL when watched
- public URLs checked with HTTP status
- local and public link-check result
- checks intentionally skipped and why
- any remaining warning, such as GitHub Actions Node runtime deprecation
