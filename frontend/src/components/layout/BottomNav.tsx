import { NavLink } from 'react-router-dom';

import { cn } from '../../lib/utils';

const tabs = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.5z" />
      </svg>
    )
  },
  {
    to: '/daily-log',
    label: 'Log',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path strokeLinecap="round" d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    )
  },
  {
    to: '/analytics',
    label: 'Stats',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" d="M4 20V9m8 11V4m8 16v-7" />
      </svg>
    )
  },
  {
    to: '/habits',
    label: 'Habits',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12.5l2.5 2.5L16 9.5" />
      </svg>
    )
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8 3.5-.9-.3a7.6 7.6 0 0 0-.5-1.3l.5-.8a1 1 0 0 0-.2-1.2l-1.2-1.2a1 1 0 0 0-1.2-.2l-.8.5c-.4-.2-.8-.4-1.3-.5L14 4a1 1 0 0 0-1-.8h-2a1 1 0 0 0-1 .8l-.3.9c-.5.1-.9.3-1.3.5l-.8-.5a1 1 0 0 0-1.2.2L5.2 6.3a1 1 0 0 0-.2 1.2l.5.8c-.2.4-.4.8-.5 1.3L4 10a1 1 0 0 0-.8 1v2a1 1 0 0 0 .8 1l.9.3c.1.5.3.9.5 1.3l-.5.8a1 1 0 0 0 .2 1.2l1.2 1.2a1 1 0 0 0 1.2.2l.8-.5c.4.2.8.4 1.3.5l.3.9a1 1 0 0 0 1 .8h2a1 1 0 0 0 1-.8l.3-.9c.5-.1.9-.3 1.3-.5l.8.5a1 1 0 0 0 1.2-.2l1.2-1.2a1 1 0 0 0 .2-1.2l-.5-.8c.2-.4.4-.8.5-1.3l.9-.3a1 1 0 0 0 .8-1v-2a1 1 0 0 0-.8-1z"
        />
      </svg>
    )
  }
];

const BottomNav = (): JSX.Element => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex items-center justify-around h-16">
      <ul className="grid w-full grid-cols-5">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium',
                  isActive ? 'text-accent-600' : 'text-gray-500'
                )
              }
            >
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default BottomNav;
