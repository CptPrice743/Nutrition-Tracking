import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import AppShell from './components/layout/AppShell';
import Spinner from './components/ui/Spinner';
import { useAuth } from './hooks/useAuth';
import AnalyticsPage from './pages/AnalyticsPage';
import DailyLogPage from './pages/DailyLogPage';
import DashboardPage from './pages/DashboardPage';
import HabitsPage from './pages/HabitsPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';

const PublicRoute = (): JSX.Element => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

const ProtectedShell = (): JSX.Element => {
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

  return <AppShell />;
};

const App = (): JSX.Element => {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route path="/" element={<ProtectedShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="daily-log" element={<DailyLogPage />} />
        <Route path="daily-log/:date" element={<DailyLogPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
