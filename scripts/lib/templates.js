function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function renderHead({ title, description, themeInitScript }) {
  return `<head>
  <meta charset="UTF-8">
  <script>${themeInitScript}</script>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
  <link rel="stylesheet" href="/assets/css/style.css">
</head>`;
}

function renderHeader() {
  return `<header class="site-header">
    <a class="site-header__title" href="/">My Blog</a>
    <button id="theme-toggle" class="theme-toggle" aria-label="Toggle dark mode" aria-pressed="false">🌓</button>
  </header>`;
}

function renderFooter() {
  const year = new Date().getFullYear();
  return `<footer class="site-footer">
    <p>&copy; ${year} My Blog. Built from Markdown with Node.js + marked.</p>
  </footer>`;
}

function renderLayout({ title, description, themeInitScript, main }) {
  return `<!DOCTYPE html>
<html lang="en">
${renderHead({ title, description, themeInitScript })}
<body>
${renderHeader()}
<main>
${main}
</main>
${renderFooter()}
<script src="/assets/js/theme.js" defer></script>
</body>
</html>
`;
}

export function renderIndexPage(posts, { themeInitScript }) {
  const items = posts
    .map(
      (post) => `    <li class="post-card">
      <h2 class="post-card__title"><a href="/posts/${post.slug}.html">${escapeHtml(post.title)}</a></h2>
      <div class="post-card__meta"><time datetime="${post.dateIso}">${post.dateDisplay}</time></div>
      <p class="post-card__excerpt">${escapeHtml(post.description)}</p>
    </li>`
    )
    .join('\n');

  const main = `  <h1 class="page-title">Posts</h1>
  <ul class="post-list">
${items}
  </ul>`;

  return renderLayout({
    title: 'My Blog',
    description: 'A blog built from Markdown files.',
    themeInitScript,
    main,
  });
}

export function renderPostPage(post, { themeInitScript }) {
  const tagsHtml = post.tags.length
    ? `<div class="post-header__tags">${post.tags.map((tag) => escapeHtml(tag)).join(', ')}</div>`
    : '';

  const main = `  <a class="back-link" href="/">&larr; Back to all posts</a>
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
  });
}
