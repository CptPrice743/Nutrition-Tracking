import { NavLink, useLocation } from 'react-router-dom';

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" />
  </svg>
);

const DailyLogIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M8 2v4M16 2v4M3 10h18" />
    <path d="M12 14v4M10 16h4" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 17 8 12 13 15 21 7" />
  </svg>
);

const HabitsIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const tabs = [
  { to: '/', label: 'Home', icon: DashboardIcon, end: true },
  { to: '/daily-log', label: 'Log', icon: DailyLogIcon, end: false },
  { to: '/analytics', label: 'Analytics', icon: AnalyticsIcon, end: false },
  { to: '/habits', label: 'Habits', icon: HabitsIcon, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false }
];

const BottomTabBar = (): JSX.Element => {
  const location = useLocation();

  return (
    <nav
      className="md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        height: 'calc(var(--tab-bar-height) + var(--safe-bottom))',
        paddingBottom: 'var(--safe-bottom)',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      {tabs.map(({ to, label, icon: Icon, end }) => {
        const isActive = end
          ? location.pathname === to
          : location.pathname === to || location.pathname.startsWith(to + '/');

        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              minHeight: 44,
              textDecoration: 'none',
              color: isActive ? 'var(--primary)' : 'var(--text-tertiary)',
              touchAction: 'manipulation'
            }}
          >
            <Icon />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}
            >
              {label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomTabBar;
