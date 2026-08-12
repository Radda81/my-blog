function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function renderHead({ title, description, themeInitScript, basePath }) {
  return `<head>
  <meta charset="UTF-8">
  <script>${themeInitScript}</script>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
  <link rel="stylesheet" href="${basePath}assets/css/style.css">
</head>`;
}

function renderHeader({ basePath }) {
  return `<header class="site-header">
    <a class="site-header__title" href="${basePath}index.html">My Blog</a>
    <button id="theme-toggle" class="theme-toggle" aria-label="Toggle dark mode" aria-pressed="false">🌓</button>
  </header>`;
}

function renderFooter() {
  const year = new Date().getFullYear();
  return `<footer class="site-footer">
    <p>&copy; ${year} My Blog. Built from Markdown with Node.js + marked.</p>
  </footer>`;
}

function renderLayout({ title, description, themeInitScript, main, basePath }) {
  return `<!DOCTYPE html>
<html lang="en">
${renderHead({ title, description, themeInitScript, basePath })}
<body>
${renderHeader({ basePath })}
<main>
${main}
</main>
${renderFooter()}
<script src="${basePath}assets/js/theme.js" defer></script>
</body>
</html>
`;
}

export function renderIndexPage(posts, apps, { themeInitScript }) {
  const basePath = '';
  const items = posts
    .map(
      (post) => `    <li class="post-card">
      <h2 class="post-card__title"><a href="posts/${post.slug}.html">${escapeHtml(post.title)}</a></h2>
      <div class="post-card__meta"><time datetime="${post.dateIso}">${post.dateDisplay}</time></div>
      <p class="post-card__excerpt">${escapeHtml(post.description)}</p>
    </li>`
    )
    .join('\n');

  const appItems = apps
    .map(
      (app) => `    <li class="post-card">
      <h2 class="post-card__title"><a href="${app.path}">${escapeHtml(app.name)}</a></h2>
      <p class="post-card__excerpt">${escapeHtml(app.description)}</p>
    </li>`
    )
    .join('\n');

  const appsSection = apps.length
    ? `  <h1 class="page-title">Apps</h1>
  <ul class="post-list">
${appItems}
  </ul>

`
    : '';

  const main = `${appsSection}  <h1 class="page-title">Posts</h1>
  <ul class="post-list">
${items}
  </ul>`;

  return renderLayout({
    title: 'My Blog',
    description: 'A blog built from Markdown files.',
    themeInitScript,
    main,
    basePath,
  });
}

export function renderPostPage(post, { themeInitScript }) {
  const basePath = '../';
  const tagsHtml = post.tags.length
    ? `<div class="post-header__tags">${post.tags.map((tag) => escapeHtml(tag)).join(', ')}</div>`
    : '';

  const main = `  <a class="back-link" href="${basePath}index.html">&larr; Back to all posts</a>
  <article>
    <header class="post-header">
      <h1>${escapeHtml(post.title)}</h1>
      <div class="post-header__meta"><time datetime="${post.dateIso}">${post.dateDisplay}</time></div>
      ${tagsHtml}
    </header>
${post.htmlBody}
  </article>`;

  return renderLayout({
    title: post.title,
    description: post.description,
    themeInitScript,
    main,
    basePath,
  });
}
