import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/daily-log', label: 'Daily Log' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/habits', label: 'Habits' },
  { to: '/settings', label: 'Settings' }
];

const Sidebar = (): JSX.Element => {
  return (
    <aside className="hidden w-60 border-r border-slate-200 bg-white p-4 md:block">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">NutriLog</h1>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm ${
                isActive ? 'bg-accent-100 text-accent-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;