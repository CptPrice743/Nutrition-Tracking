import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';

const SettingsPage = (): JSX.Element => {
  const { signOut, user } = useAuth();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <p className="text-sm text-slate-600">Signed in as</p>
        <p className="font-medium">{user?.email}</p>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => void signOut()}>
            Sign Out
          </Button>
        </div>
      </Card>
    </section>
  );
};

export default SettingsPage;
