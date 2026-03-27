import { useState, type FormEvent } from 'react';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';

const LoginPage = (): JSX.Element => {
  const { signInWithEmail, signInWithGoogle, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await signInWithEmail(email, password);
    } catch {
      setError('Sign in failed. Check your credentials.');
    }
  };

  const handleSignUp = async () => {
    setError(null);
    try {
      await signUp(email, password);
    } catch {
      setError('Sign up failed. Try a different email.');
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError('Google sign in failed.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold">NutriLog</h1>
        <p className="mb-6 text-sm text-slate-600">Sign in to continue.</p>

        <form className="space-y-3" onSubmit={handleSignIn}>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" required />
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Sign In</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={handleSignUp}>
              Sign Up
            </Button>
          </div>
          <Button type="button" variant="secondary" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
