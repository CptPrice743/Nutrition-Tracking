const STORAGE_KEY = 'nutrilog-theme';
type Theme = 'light' | 'dark';

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // ignore
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function initTheme(): void {
  const theme = getStoredTheme();
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function toggleTheme(): void {
  const isDark = document.documentElement.classList.contains('dark');
  const next: Theme = isDark ? 'light' : 'dark';
  if (next === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
}

export function getCurrentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
