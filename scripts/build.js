import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAllPosts } from './lib/markdown.js';
import { renderIndexPage, renderPostPage } from './lib/templates.js';
import { ensureDir, emptyDir, copyDir } from './lib/paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const postsDir = path.join(rootDir, 'posts');
const srcDir = path.join(rootDir, 'src');
const appsDir = path.join(rootDir, 'apps');
const distDir = path.join(rootDir, 'dist');

const apps = [
  {
    name: '2048',
    description: '방향키/스와이프로 타일을 밀어 합치는 퍼즐 게임. 점수판과 최고 기록을 지원합니다.',
    path: 'apps/2048/index.html',
  },
  {
    name: '픽셀 아트 에디터',
    description: '16x16 격자에 클릭/드래그로 도트를 찍어 그림을 그리고 PNG로 저장할 수 있는 에디터.',
    path: 'apps/pixel-art/index.html',
  },
];

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

  if (fs.existsSync(appsDir)) {
    copyDir(appsDir, path.join(distDir, 'apps'), { skipExtensions: ['.md'] });
  }

  const posts = loadAllPosts(postsDir);

  fs.writeFileSync(
    path.join(distDir, 'index.html'),
    renderIndexPage(posts, apps, { themeInitScript })
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
