import { useEffect, useState } from 'react';

import { getCurrentTheme, toggleTheme } from '../../lib/theme';

const ThemeToggle = (): JSX.Element => {
  const [isDark, setIsDark] = useState(() => getCurrentTheme() === 'dark');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleToggle = () => {
    toggleTheme();
    setIsDark((prev) => !prev);
  };

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={handleToggle}
      style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--radius-md)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-tertiary)',
        transition: 'background var(--transition)',
        flexShrink: 0
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {isDark ? (
        // Sun icon
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Moon icon
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;
