# PDF Export

## Purpose

Export `.vspec.md` as HTML / PDF artifacts for review and sharing.

## Target Result

Keep source in Git. Use HTML for browser review and PDF for distribution.

## Minimal Command

```bash
npx @markvspec/cli@latest export html examples/01-basics/hello-screen.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf examples/01-basics/hello-screen.vspec.md --out markvspec-pdf
```

## Related Example

- [Hello Screen](../../../examples/showcase/hello-screen.html)

## Related Reference

- [Export Start](../start/export.md)
- [Reference](../reference/index.md)

## Verify

- HTML export creates `hello-screen.html`.
- PDF export needs a Chrome-compatible browser.
- For CI or release work, verify HTML export first.
