import fs from 'node:fs';
import path from 'node:path';

export function slugify(filePath) {
  return path.basename(filePath, '.md');
}

export function formatDate(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  const iso = date.toISOString().slice(0, 10);
  const display = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return { date, iso, display };
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function emptyDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

export function copyDir(fromDir, toDir, { skipExtensions = [] } = {}) {
  ensureDir(toDir);
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const from = path.join(fromDir, entry.name);
    const to = path.join(toDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to, { skipExtensions });
    } else if (!skipExtensions.includes(path.extname(entry.name))) {
      fs.copyFileSync(from, to);
    }
  }
}
