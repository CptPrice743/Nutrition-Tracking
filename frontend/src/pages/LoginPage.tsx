import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width={18} height={18} focusable="false">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z" />
    <path fill="#34A853" d="M3.6 7.6l3.2 2.4C7.6 8.3 9.6 7 12 7c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 8.3 2.5 5 4.6 3.6 7.6z" />
    <path fill="#FBBC05" d="M12 21.5c2.5 0 4.6-.8 6.2-2.3l-2.9-2.4c-.8.5-1.9.9-3.3.9-2.4 0-4.5-1.6-5.2-3.8l-3.2 2.5c1.4 3 4.7 5.1 8.4 5.1z" />
    <path fill="#4285F4" d="M21.1 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.3-1.1 2.4-2.2 3.1l2.9 2.4c1.7-1.6 2.9-3.9 2.9-7.8z" />
  </svg>
);

type AuthTab = 'sign-in' | 'sign-up';

const LoginPage = (): JSX.Element => {
  const { user, signInWithEmail, signInWithGoogle, signUp } = useAuth();
  const [tab, setTab] = useState<AuthTab>('sign-in');
  const [loadingAction, setLoadingAction] = useState<'sign-in' | 'sign-up' | 'google' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    if (hasPasswordMismatch) return;
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
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        background: 'var(--surface)'
      }}
    >
      {/* Left hero panel — desktop only */}
      <div
        className="hidden md:flex"
        style={{
          width: '50%',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d1117',
          backgroundImage: 'var(--hero-glow)',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 360 }}>
          {/* Logo */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 32 }}>N</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div className="display" style={{ color: '#ffffff', marginBottom: 8 }}>NutriLog</div>
            <div className="page-eyebrow" style={{ textAlign: 'center', marginBottom: 0 }}>Elite Performance</div>
          </div>

          {/* Texture stats */}
          <div
            style={{
              marginTop: 16,
              padding: '16px 24px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
              2,340 kcal · 78.4 kg · 14d streak
            </span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px'
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo */}
          <div className="flex md:hidden" style={{ alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>N</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>NutriLog</span>
          </div>

          <h1 className="headline" style={{ marginBottom: 4 }}>
            {tab === 'sign-in' ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>
            {tab === 'sign-in' ? 'Sign in to continue' : 'Start tracking your nutrition'}
          </p>

          {/* Google button */}
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={() => void handleGoogle()}
            style={{
              width: '100%',
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              background: 'var(--surface-container)',
              border: '1.5px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-card)',
              transition: 'box-shadow var(--transition)',
              marginBottom: 20
            }}
          >
            {loadingAction === 'google' ? (
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Signing in...</span>
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--surface-container-low)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--surface-container-low)' }} />
          </div>

          {/* Tab switcher */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-md)',
              padding: 4,
              marginBottom: 20
            }}
          >
            {(['sign-in', 'sign-up'] as AuthTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); }}
                style={{
                  minHeight: 36,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'background var(--transition), color var(--transition)',
                  background: tab === t ? 'var(--surface-container)' : 'transparent',
                  color: tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  boxShadow: tab === t ? 'var(--shadow-card)' : 'none'
                }}
              >
                {t === 'sign-in' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Form */}
          {tab === 'sign-in' ? (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="field-label" htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="login-password">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-password"
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-tertiary)',
                      padding: 4
                    }}
                  >
                    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                      {showPassword
                        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
                        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                      }
                    </svg>
                  </button>
                </div>
              </div>
              {error ? <p style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>{error}</p> : null}
              <button
                type="submit"
                className="btn-primary"
                disabled={loadingAction !== null}
                style={{ width: '100%', justifyContent: 'center', height: 46 }}
              >
                {loadingAction === 'sign-in' ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="field-label" htmlFor="signup-email">Email</label>
                <input
                  id="signup-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="signup-confirm">Confirm Password</label>
                <input
                  id="signup-confirm"
                  className="input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  style={showPasswordMismatch ? { borderColor: 'var(--danger)' } : {}}
                />
                {showPasswordMismatch ? (
                  <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>Passwords do not match.</p>
                ) : null}
              </div>
              {error ? <p style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>{error}</p> : null}
              <button
                type="submit"
                className="btn-primary"
                disabled={loadingAction !== null || hasPasswordMismatch}
                style={{ width: '100%', justifyContent: 'center', height: 46 }}
              >
                {loadingAction === 'sign-up' ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* Switch tab */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            {tab === 'sign-in' ? (
              <>Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setTab('sign-up'); setError(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: 13 }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setTab('sign-in'); setError(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: 13 }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
