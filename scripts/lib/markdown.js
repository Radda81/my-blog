import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { slugify, formatDate } from './paths.js';

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '');
}

function excerptFrom(htmlBody, maxLength = 160) {
  const text = stripHtml(htmlBody).replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}…` : text;
}

export function readPost(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  if (!data.title) {
    throw new Error(`Missing required "title" in frontmatter: ${filePath}`);
  }
  if (!data.date) {
    throw new Error(`Missing required "date" in frontmatter: ${filePath}`);
  }

  const { iso: dateIso, display: dateDisplay, date: sortDate } = formatDate(data.date);
  const htmlBody = marked.parse(content);

  return {
    slug: slugify(filePath),
    title: data.title,
    dateIso,
    dateDisplay,
    sortDate,
    description: data.description || excerptFrom(htmlBody),
    tags: Array.isArray(data.tags) ? data.tags : [],
    htmlBody,
    sourceFile: filePath,
  };
}

export function loadAllPosts(postsDir) {
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'));
  const posts = files.map((f) => readPost(path.join(postsDir, f)));
  posts.sort((a, b) => b.sortDate - a.sortDate);
  return posts;
}
