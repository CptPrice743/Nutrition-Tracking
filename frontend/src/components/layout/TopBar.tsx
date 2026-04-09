import { useLocation } from 'react-router-dom';

import ThemeToggle from './ThemeToggle';

const getPageName = (pathname: string): string => {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/daily-log')) return 'Daily Log';
  if (pathname.startsWith('/analytics')) return 'Analytics';
  if (pathname.startsWith('/habits')) return 'Habits';
  if (pathname.startsWith('/settings')) return 'Settings';
  return 'NutriLog';
};

const TopBar = (): JSX.Element => {
  const location = useLocation();
  const pageName = getPageName(location.pathname);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        height: 'calc(56px + var(--safe-top))',
        paddingTop: 'var(--safe-top)',
        background: 'var(--surface-container)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px'
      }}
      className="md:hidden"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>N</span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{pageName}</span>
      </div>
      <ThemeToggle />
    </header>
  );
};

export default TopBar;
