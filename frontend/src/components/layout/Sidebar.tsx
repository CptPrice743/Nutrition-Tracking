import { NavLink } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

const navItems = [
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
    label: 'Daily Log',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path strokeLinecap="round" d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    )
  },
  {
    to: '/analytics',
    label: 'Analytics',
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

const Sidebar = (): JSX.Element => {
  const { user, signOut } = useAuth();

  const userEmail = user?.email ?? 'user@nutrilog.app';
  const userInitial = (user?.displayName ?? userEmail).trim().charAt(0).toUpperCase() || 'U';

  return (
    <aside className="h-full w-full bg-white border-r border-gray-100 flex flex-col">
      <div className="p-4">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">NutriLog</h1>
      </div>
      <nav className="space-y-2 px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent-50 text-accent-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-gray-100 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">
            {userInitial}
          </div>
          <p className="truncate text-sm text-gray-700">{userEmail}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void signOut();
          }}
          className="inline-flex min-h-[44px] min-w-[44px] w-full items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;