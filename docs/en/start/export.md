# Export

MarkVSpec can export HTML / PDF from `.vspec.md`.

## VS Code

Run either command from the Command Palette.

```text
MarkVSpec: Export Static HTML
MarkVSpec: Export PDF
```

![VS Code Command Palette showing MarkVSpec HTML and PDF export commands](../../assets/start/vscode-export-command.png)

For a first run, exporting from the VS Code extension is the simplest path.

## HTML

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
```

This creates `hello-screen.html` in the output directory. Use it as a static artifact for review and sharing.

## PDF

```bash
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

PDF export needs a Chrome-compatible browser. If the environment has no browser available, use HTML export to inspect the result.

## Next

- [Examples](../examples/index.md)
- [Guide](../guide/index.md)
