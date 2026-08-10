---
title: "Why I Chose a Static Site"
date: 2026-08-05
description: "Fewer moving parts, faster pages, and a build step you can actually understand."
tags: [static-sites, tooling]
---

There are a lot of ways to build a blog. I ended up choosing the simplest one that still felt good to use: a static site generated at build time from Markdown files.

## Fewer moving parts

There's no database, no server-side rendering, and no client-side framework fetching content after the page loads. Every page is a plain HTML file that a browser can display immediately.

## It's easy to reason about

The whole pipeline is: read a `.md` file, parse its frontmatter, convert the body to HTML, and drop it into a template. That's it. When something looks wrong on a page, there are only a few places to look.

## It's fast by default

Because the output is just HTML, CSS, and a tiny bit of JavaScript for the [dark mode toggle](/), there's very little for the browser to do before the page is readable. No hydration, no waiting on a bundle.

None of this is a new idea — plenty of tools automate exactly this. But writing the build script by hand made it easy to keep the output exactly as simple as I wanted it to be.
