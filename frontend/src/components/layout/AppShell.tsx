import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import Spinner from '../ui/Spinner';
import BottomNav from './BottomNav';
import ServerWakeupBanner from './ServerWakeupBanner';
import Sidebar from './Sidebar';

const AppShell = (): JSX.Element => {
  const { user, loading } = useAuth();
  const location = useLocation();

  const getCurrentPageTitle = (pathname: string): string => {
    if (pathname === '/') {
      return 'Home';
    }
    if (pathname.startsWith('/daily-log')) {
      return 'Daily Log';
    }
    if (pathname.startsWith('/analytics')) {
      return 'Analytics';
    }
    if (pathname.startsWith('/habits')) {
      return 'Habits';
    }
    if (pathname.startsWith('/settings')) {
      return 'Settings';
    }
    return 'NutriLog';
  };

  const currentPageTitle = getCurrentPageTitle(location.pathname);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-[240px] md:flex-col">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="min-h-screen pb-16 md:ml-[240px] md:pb-0">
        <header className="border-b border-gray-100 bg-white md:hidden">
          <div className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">NutriLog</p>
            <h1 className="mt-0.5 text-lg font-semibold text-gray-900">{currentPageTitle}</h1>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-4">
            <ServerWakeupBanner />
          </div>
          <Outlet />
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
};

export default AppShell;
