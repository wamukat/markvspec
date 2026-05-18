---
name: markvspec-release
description: "Project-specific release workflow for MarkVSpec. Use when preparing or executing a MarkVSpec release, bumping a release version, tagging, validating release artifacts, checking GitHub Actions release runs, or deciding which GitHub issues are included in a release."
---

# MarkVSpec Release

Use this skill for MarkVSpec release preparation and execution.

## Scope

Repository: `wamukat/markvspec`

Release work usually touches:

- root `package.json`
- workspace package versions
- `package-lock.json`
- README / README.ja distribution status
- VS Code extension packaging
- CLI packaging
- GitHub tag / Release workflow
- GitHub issues closed as released

Do not close issues only because they are open during release cleanup. Confirm
that the shipped release actually contains the fix or feature.

## Preflight

1. Confirm branch and workspace state.

```bash
git status --short --branch
git remote -v
```

2. Confirm the target version with the user when it is not explicit.
3. Inspect release gates before relying on workflow names, package scripts, or
   publication behavior.

```bash
sed -n '1,220p' .github/workflows/release.yml
cat package.json
sed -n '1,180p' docs/en/maintainers/release-checklist.md
sed -n '1,180p' docs/ja/maintainers/release-checklist.md
```

4. Inspect recent release-related commits and open issues.

```bash
git log --oneline --decorate -20
gh issue list --repo wamukat/markvspec --state open --limit 100 --json number,title,labels,body,url
```

## Version Bump

Update the requested version consistently across package metadata.

After editing, run:

```bash
npm install --package-lock-only
npm run check:readme-release
```

The README release-state check must pass before tagging.

## Release Verification

Run the release check before creating a tag:

```bash
npm run check:release
```

If the full release check is too expensive for an intermediate step, run the
smallest relevant subset first, but do not tag until `npm run check:release`
passes.

For artifact smoke checks, prefer the project scripts and package commands
already used by the repository:

```bash
npm run typecheck
npm run build -w @markvspec/cli
npm run build -w packages/vscode-extension
```

When packaging manually, verify both:

- VSIX can be created and inspected.
- CLI tarball can be packed and invoked from a temporary directory.

## Commit And Tag

Commit the release version bump and release metadata before tagging.

Default mode is local preparation and validation. Push commits, create or push
tags, close issues, and trigger the tag-driven release workflow only when the
user has asked for release execution or explicitly confirmed publication.

Before pushing, confirm the release branch from `git status --short --branch`
and repository inspection. Do not assume a branch name without checking it.

```bash
git add <release files>
git commit -m "chore: release <version>"
git tag -a "v<version>" -m "v<version>"
# Example after confirming the release branch is main:
git push origin main
git push origin "v<version>"
```

If a tag was created before required release fixes, delete and recreate the tag
only after confirming with the user.

## GitHub Actions Release

The release workflow is tag-driven. After pushing the tag:

```bash
gh run list --repo wamukat/markvspec --workflow Release --limit 5
gh run watch <run-id> --repo wamukat/markvspec --exit-status
gh run view <run-id> --repo wamukat/markvspec --log-failed
```

If publishing fails:

- npm publish requires `NPM_TOKEN` in GitHub repository secrets.
- VS Code Marketplace publish requires `VSCE_PAT` in GitHub repository secrets.
- The workflow validates that the tag version matches package metadata.

Inspect failed job names and messages. Do not expose token values. If a secret
is missing, tell the user which secret name is required.

## Post-Release Issue Cleanup

Before closing a GitHub issue as released:

0. Only perform issue cleanup after the release workflow succeeds, or after the
   user explicitly confirms a manual or partial release is acceptable.
1. Identify the concrete release commit(s), tests, or artifact behavior that
   satisfy the issue.
2. Confirm the issue is part of the current release. If the user says an issue
   is not released, leave it open.
3. Add a concise comment explaining the released fix and evidence.
4. Close with `completed`.

Commands:

```bash
gh issue comment <number> --repo wamukat/markvspec --body "<release note>"
gh issue close <number> --repo wamukat/markvspec --reason completed
```

Keep release-tracking or not-yet-shipped issues open.

## Final Report

Report:

- version
- commit SHA and tag
- commands run and pass/fail results
- release workflow run ID or URL when watched
- artifact checks performed, with package names or artifact paths
- GitHub issues closed and explicitly left open
- checks intentionally skipped and why
- any remaining manual publication or secret setup required
