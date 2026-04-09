import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import Spinner from '../ui/Spinner';
import BottomTabBar from './BottomTabBar';
import ServerWakeupBanner from './ServerWakeupBanner';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const AppShell = (): JSX.Element => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100dvh',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface)'
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ background: 'var(--surface)', minHeight: '100dvh' }}>
      <ServerWakeupBanner />

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile top bar */}
      <TopBar />

      {/* Main content */}
      <main
        style={{
          minHeight: '100dvh'
        }}
        className="md:pl-[var(--sidebar-width)] pt-[calc(56px+var(--safe-top))] md:pt-0"
      >
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <BottomTabBar />
    </div>
  );
};

export default AppShell;
