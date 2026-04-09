import { NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import ThemeToggle from './ThemeToggle';

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" />
  </svg>
);

const DailyLogIcon = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M8 2v4M16 2v4M3 10h18" />
    <path d="M12 14v4M10 16h4" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 17 8 12 13 15 21 7" />
  </svg>
);

const HabitsIcon = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const navItems = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/daily-log', label: 'Daily Log', icon: DailyLogIcon, end: false },
  { to: '/analytics', label: 'Analytics', icon: AnalyticsIcon, end: false },
  { to: '/habits', label: 'Habits', icon: HabitsIcon, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false }
];

const Sidebar = (): JSX.Element => {
  const { user } = useAuth();
  const location = useLocation();

  const displayName = user?.displayName ?? user?.email ?? 'User';
  const email = user?.email ?? '';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: 'var(--sidebar-width)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-container)',
        zIndex: 40,
        overflowY: 'auto'
      }}
      className="dark:!bg-[#0d1421]"
    >
      {/* Logo */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 20px',
          flexShrink: 0
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>N</span>
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            NutriLog
          </div>
          <div className="overline" style={{ fontSize: 9, marginTop: 1 }}>
            Elite Performance
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        {navItems.map(({ to, label, icon: Icon, end }) => {
          const isActive = end
            ? location.pathname === to
            : location.pathname === to || location.pathname.startsWith(to + '/');

          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 40,
                borderRadius: 'var(--radius-md)',
                paddingLeft: isActive ? 9 : 12,
                paddingRight: 12,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                transition: 'background var(--transition), color var(--transition)',
                color: isActive ? 'var(--primary)' : 'var(--text-tertiary)',
                background: isActive ? 'var(--primary-dim)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-container-low)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                }
              }}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom: user + theme toggle */}
      <div
        style={{
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--surface-container-low)'
        }}
        className="dark:!bg-[#0a0f1a]"
      >
        {/* Avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--info-bg)',
            color: 'var(--info-text)',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {displayName.split(' ')[0]}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {email}
          </div>
        </div>

        <ThemeToggle />
      </div>
    </aside>
  );
};

export default Sidebar;
