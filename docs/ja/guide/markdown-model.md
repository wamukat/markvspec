# Markdown Model

MarkVSpec は Markdown を source of truth にします。YAML Front Matter は文書全体の metadata、Markdown 見出しは画面内の object、箇条書きは property や振る舞いを表します。

## 最小例

```markdown
---
id: SCR-HELLO
title: Hello Screen
---

# Hello Screen

## States

### idle

## Layout

### L-Main Main

- column

## Elements

### E-Title Heading

- level: 1
- text: Hello
```

## 関連 example

- [Hello Screen](../../../examples/showcase/hello-screen.html)

## 関連 reference

- [Reference](../reference/index.md)
