# Start

This is the shortest path for trying MarkVSpec for the first time.

In about five minutes, you can install the VS Code extension, inspect Hello Screen, open the live preview, and export HTML / PDF.

## Try It In 5 Minutes

### Step 1: Install The Extension

Install [MarkVSpec for VS Code](https://marketplace.visualstudio.com/items?itemName=wamukat.markvspec) from VS Code Marketplace.

Or install it from the command line:

```bash
code --install-extension wamukat.markvspec
```

### Step 2: Open Hello Screen

Open this repository, then open [Hello Screen](../../../examples/01-basics/hello-screen.vspec.md).

```bash
code examples/01-basics/hello-screen.vspec.md
```

### Step 3: Open Preview

Run this from the Command Palette.

```text
MarkVSpec: Open Preview
```

### Step 4: Export HTML / PDF

Export HTML / PDF when you need shareable output.

```bash
npx @markvspec/cli@latest export html examples/01-basics/hello-screen.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf examples/01-basics/hello-screen.vspec.md --out markvspec-pdf
```

## Details

- [First Screen](first-screen.md): Read Hello Screen.
- [Preview](preview.md): Open the VS Code live preview.
- [Export](export.md): Export HTML / PDF.

## Next

- [Examples](../examples/index.md): Examples ordered as a learning path.
- [Guide](../guide/index.md): MarkVSpec basics.
- [Reference](../reference/index.md): Syntax details.
