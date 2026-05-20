# MarkVSpec

Write UI specifications in Markdown.

- VS Code live preview
- Wireframe rendering
- HTML / PDF export
- AI-friendly text format
- Git-friendly UI specs

日本語の説明は [README.ja.md](README.ja.md) を参照してください。

![Hello Screen Markdown source next to the generated MarkVSpec static HTML preview](docs/assets/readme-hello-screen-preview.png)

## Try It

1. Install the VS Code extension from the
   [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=wamukat.markvspec).

   ```sh
   code --install-extension wamukat.markvspec
   ```

2. Open [Hello Screen](examples/01-basics/hello-screen.vspec.md) in VS Code.

3. Run:

   ```text
   MarkVSpec: Open Preview
   ```

## Where To Go Next

- [Website](https://wamukat.github.io/markvspec/)
- [Start guide](https://wamukat.github.io/markvspec/docs/en/start/)
- [Examples](https://wamukat.github.io/markvspec/examples/)
- [Guide](https://wamukat.github.io/markvspec/docs/en/guide/)
- [Reference](https://wamukat.github.io/markvspec/docs/en/reference/)
- [Recipes](https://wamukat.github.io/markvspec/docs/en/recipes/)

## Tools

- VS Code extension: `wamukat.markvspec`
- CLI package: `@markvspec/cli`

```sh
npx @markvspec/cli@latest validate examples/01-basics/hello-screen.vspec.md
npx @markvspec/cli@latest export html examples/01-basics/hello-screen.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf examples/01-basics/hello-screen.vspec.md --out markvspec-pdf
```

## For Contributors

```sh
npm run typecheck
npm test
npm run build
```

Maintainer notes live under [docs/en/maintainers/](docs/en/maintainers/) and
[docs/ja/maintainers/](docs/ja/maintainers/).

Release maintainers must run `npm run check:readme-release` before tagging.
