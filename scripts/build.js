import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAllPosts } from './lib/markdown.js';
import { renderIndexPage, renderPostPage } from './lib/templates.js';
import { ensureDir, emptyDir } from './lib/paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const postsDir = path.join(rootDir, 'posts');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

function copyFile(from, to) {
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
}

function build() {
  emptyDir(distDir);
  ensureDir(path.join(distDir, 'posts'));
  ensureDir(path.join(distDir, 'assets', 'css'));
  ensureDir(path.join(distDir, 'assets', 'js'));

  copyFile(
    path.join(srcDir, 'css', 'variables.css'),
    path.join(distDir, 'assets', 'css', 'variables.css')
  );
  copyFile(
    path.join(srcDir, 'css', 'style.css'),
    path.join(distDir, 'assets', 'css', 'style.css')
  );
  copyFile(
    path.join(srcDir, 'js', 'theme.js'),
    path.join(distDir, 'assets', 'js', 'theme.js')
  );

  const themeInitScript = fs.readFileSync(
    path.join(srcDir, 'js', 'theme-init.js'),
    'utf-8'
  );

  const posts = loadAllPosts(postsDir);

  fs.writeFileSync(
    path.join(distDir, 'index.html'),
    renderIndexPage(posts, { themeInitScript })
  );

  for (const post of posts) {
    fs.writeFileSync(
      path.join(distDir, 'posts', `${post.slug}.html`),
      renderPostPage(post, { themeInitScript })
    );
  }

  console.log(`Built ${posts.length} post(s) -> ${path.relative(rootDir, distDir)}/`);
}

build();
