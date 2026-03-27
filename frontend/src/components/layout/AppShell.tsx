import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import Spinner from '../ui/Spinner';
import BottomNav from './BottomNav';
import ServerWakeupBanner from './ServerWakeupBanner';
import Sidebar from './Sidebar';

const AppShell = (): JSX.Element => {
  const { user, loading } = useAuth();

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <Sidebar />
        <main className="flex-1 p-4 pb-20 md:p-8 md:pb-8">
          <header className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Welcome{user?.displayName ? `, ${user.displayName}` : ''}</h2>
          </header>
          <div className="mb-4">
            <ServerWakeupBanner />
          </div>
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default AppShell;
