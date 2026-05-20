---
name: markvspec-pages-deploy
description: "Project-specific GitHub Pages workflow for MarkVSpec. Use when changing, debugging, deploying, or validating the MarkVSpec Starlight docs site, README Pages links, generated example previews, or Pages link checks."
---

# MarkVSpec Pages Deploy

Use this skill for MarkVSpec GitHub Pages work.

## Directory Model

- `docs-site/`: Astro Starlight app and published documentation source.
- `docs-site/src/content/docs/`: Starlight Markdown content.
- `docs-site/src/pages/examples/`: Astro pages for the example catalog and showcase.
- `examples/`: `.vspec.md` example source.
- `docs-site/public/examples/`: generated example HTML/PDF prepared by `build:pages`, ignored by git.
- `_site/`: generated Pages output, ignored by git.

Do not reintroduce `site/` as a source tree. The old static HTML docs source was removed after the Starlight migration.

Published documentation URLs use Starlight locale paths:

- `https://wamukat.github.io/markvspec/ja/start/`
- `https://wamukat.github.io/markvspec/en/start/`
- `https://wamukat.github.io/markvspec/examples/`
- `https://wamukat.github.io/markvspec/examples/showcase/hello-screen.html`

Do not add redirects, canonical stubs, or generated pages for old `/markvspec/docs/...` URLs unless the user explicitly changes that policy.

## Build

Before changing Pages behavior, inspect:

```bash
sed -n '1,240p' scripts/build-github-pages.mjs
sed -n '1,260p' scripts/check-pages-site.mjs
find docs-site/src -maxdepth 4 -type f | sort
```

Build locally:

```bash
npm run build -w @markvspec/cli
npm run build:pages
npm run check:pages-site
```

Expected output includes:

- `_site/index.html`
- `_site/ja/start/index.html`
- `_site/en/start/index.html`
- `_site/examples/index.html`
- `_site/examples/showcase/hello-screen.html/index.html`
- `_site/examples/generated/hello-screen.html`
- `_site/examples/generated/hello-screen.pdf`
- `_site/pagefind/pagefind.js`

`build:pages` prepares generated examples, copies brand assets into `docs-site/public/`, runs the Starlight build, and copies `docs-site/dist` to `_site`.

## Link Rules

Pages HTML may link to:

- Starlight docs under `/markvspec/ja/...` or `/markvspec/en/...`
- example catalog and showcase pages under `/markvspec/examples/...`
- generated preview/PDF artifacts under `/markvspec/examples/generated/...`
- external project links such as GitHub, npm, or the VS Code Marketplace

Decision rules:

- README and docs links should point to the new Starlight URLs, not `/markvspec/docs/...`.
- Example showcase related-doc links should be validated through `examples/catalog.yml`.
- Generated example links should resolve under `/markvspec/examples/generated/...`.
- Avoid GitHub blob links for user-facing docs when a Starlight page exists.

## Publish Boundary

Default mode is local build and link validation. Commit, push, or deploy only when the user asks for it or the current task explicitly includes deployment.

Before pushing, confirm the branch, remote, intended diff, and target workflow. Pages deploy runs on pushes to `main`; after pushing, watch the GitHub Pages workflow and verify public URLs.

## Required Validation

Run:

```bash
npm run build:pages
npm run check:pages-site
npm run audit:examples
git diff --check
```

For local browser preview:

```bash
npm --prefix docs-site run preview -- --host 127.0.0.1
```

Smoke-check representative local URLs:

- `/markvspec/`
- `/markvspec/ja/start/`
- `/markvspec/en/start/`
- `/markvspec/examples/`
- `/markvspec/examples/showcase/hello-screen.html`
- `/markvspec/examples/generated/hello-screen.html`
- `/markvspec/examples/generated/hello-screen.pdf`
- `/markvspec/pagefind/pagefind.js`

For header, layout, or visual changes, inspect at least one English page, one Japanese page, and one example showcase in a browser or with `agent-browser`.

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
curl -I -L https://wamukat.github.io/markvspec/ja/start/
curl -I -L https://wamukat.github.io/markvspec/en/start/
curl -I -L https://wamukat.github.io/markvspec/examples/
curl -I -L https://wamukat.github.io/markvspec/examples/showcase/hello-screen.html
```

If public URLs 404 after a successful workflow, inspect artifact root, upload path, base path `/markvspec/`, and workflow freshness before changing content.

## Final Report

Report:

- commit SHA
- commands run and pass/fail results
- Pages workflow run ID or URL when watched
- public URLs checked with HTTP status
- local and public link-check result
- checks intentionally skipped and why
- any remaining warning
