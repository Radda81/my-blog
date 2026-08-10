---
title: "Writing Clean Markdown"
date: 2026-08-03
description: "A few habits that make Markdown source easier to read and maintain."
tags: [writing, markdown]
---

Markdown is meant to be readable even before it's rendered. A few habits help keep it that way.

## Structure with headings

Use headings to break a post into scannable sections, rather than one long wall of text.

## Keep lists short

- One idea per line
- Avoid nesting more than one level deep
- Prefer short items over long paragraphs inside a list

## Inline code and code blocks

Use `inline code` for short references like a function name or a file path. For anything longer, use a fenced code block:

```js
function greet(name) {
  return `Hello, ${name}!`;
}
```

## Quoting sources

> Good writing is clear thinking made visible.

Keeping the raw `.md` file clean makes it easier to review changes and easier for the build script to convert reliably into HTML.
