import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Home' },
  { to: '/daily-log', label: 'Logs' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/habits', label: 'Habits' },
  { to: '/settings', label: 'Settings' }
];

const BottomNav = (): JSX.Element => {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white md:hidden">
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                `block px-2 py-3 text-center text-xs ${
                  isActive ? 'text-accent-700' : 'text-slate-500'
                }`
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default BottomNav;
