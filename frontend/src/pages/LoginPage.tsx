import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';

type AuthTab = 'sign-in' | 'sign-up';

const LoginPage = (): JSX.Element => {
  const { user, signInWithEmail, signInWithGoogle, signUp } = useAuth();
  const [tab, setTab] = useState<AuthTab>('sign-in');
  const [loadingAction, setLoadingAction] = useState<'sign-in' | 'sign-up' | 'google' | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const hasPasswordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const showPasswordMismatch =
    confirmPassword.length > 0 &&
    confirmPassword.length >= password.length &&
    confirmPassword !== password;

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      setLoadingAction('sign-in');
      await signInWithEmail(email, password);
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (hasPasswordMismatch) {
      return;
    }

    try {
      setLoadingAction('sign-up');
      await signUp(email, password);
    } catch {
      setError('Sign up failed. Please try a different email.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGoogle = async () => {
    setError(null);

    try {
      setLoadingAction('google');
      await signInWithGoogle();
    } catch {
      setError('Google sign in failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-[400px]">
        <div className="mb-5 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-600 text-base font-bold text-white">
            N
          </div>
          <div>
            <p className="text-xl font-semibold text-slate-900">NutriLog</p>
            <p className="text-xs text-slate-500">Track smarter every day</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            className={`min-h-[44px] rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
              tab === 'sign-in' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
            onClick={() => {
              setTab('sign-in');
              setError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`min-h-[44px] rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
              tab === 'sign-up' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
            onClick={() => {
              setTab('sign-up');
              setError(null);
            }}
          >
            Sign Up
          </button>
        </div>

        {tab === 'sign-in' ? (
          <form className="space-y-3" onSubmit={handleSignIn}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <Button type="submit" className="w-full" loading={loadingAction === 'sign-in'}>
              Sign In
            </Button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={handleSignUp}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter password"
              error={showPasswordMismatch ? 'Passwords do not match.' : undefined}
              required
            />

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <Button
              type="submit"
              className="w-full"
              loading={loadingAction === 'sign-up'}
              disabled={hasPasswordMismatch}
            >
              Create Account
            </Button>
          </form>
        )}

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs uppercase tracking-wide text-slate-500">or</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <Button
          type="button"
          variant="ghost"
          loading={loadingAction === 'google'}
          className="w-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          onClick={handleGoogle}
        >
          <span className="flex items-center justify-center gap-3">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" focusable="false">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z"
              />
              <path
                fill="#34A853"
                d="M3.6 7.6l3.2 2.4C7.6 8.3 9.6 7 12 7c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 8.3 2.5 5 4.6 3.6 7.6z"
              />
              <path
                fill="#FBBC05"
                d="M12 21.5c2.5 0 4.6-.8 6.2-2.3l-2.9-2.4c-.8.5-1.9.9-3.3.9-2.4 0-4.5-1.6-5.2-3.8l-3.2 2.5c1.4 3 4.7 5.1 8.4 5.1z"
              />
              <path
                fill="#4285F4"
                d="M21.1 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.3-1.1 2.4-2.2 3.1l2.9 2.4c1.7-1.6 2.9-3.9 2.9-7.8z"
              />
            </svg>
            <span>Continue with Google</span>
          </span>
        </Button>
      </Card>
    </div>
  );
};

export default LoginPage;
