document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.getElementById('theme-toggle');
  var root = document.documentElement;

  if (!toggle) return;

  function currentTheme() {
    var attr = root.getAttribute('data-theme');
    if (attr) return attr;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    toggle.setAttribute('aria-pressed', theme === 'dark');
  }

  toggle.addEventListener('click', function () {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  toggle.setAttribute('aria-pressed', currentTheme() === 'dark');
});
