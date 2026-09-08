'use client';
import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import AccessLayout from '@/components/access-layout';
const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(10, 'Use at least 10 characters.'),
  company: z.string().optional(),
  name: z.string().optional(),
  mobile: z.string().optional(),
  designation: z.string().optional(),
  recovery: z.string().optional(),
});
export default function Auth({
  mode,
}: {
  mode: 'login' | 'register' | 'reset';
}) {
  const [error, setError] = useState(''),
    [code, setCode] = useState(''),
    [remember, setRemember] = useState(false),
    [showPassword, setShowPassword] = useState(false),
    [busy, setBusy] = useState(false);
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (mode !== 'login') return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const email = localStorage.getItem(
          'compliance-calendar:remembered-email',
        );
        if (email) {
          setValue('email', email);
          setRemember(true);
        }
      } catch {
        /* Device preferences are optional. */
      }
    });
    return () => {
      active = false;
    };
  }, [mode, setValue]);
  async function submit(data: any) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, action: mode }),
      });
      const b = (await res.json()) as any;
      if (!res.ok) throw Error(b.error);
      if (mode === 'login') {
        try {
          if (remember)
            localStorage.setItem(
              'compliance-calendar:remembered-email',
              data.email,
            );
          else localStorage.removeItem('compliance-calendar:remembered-email');
        } catch {
          /* Sign-in still succeeds when device storage is disabled. */
        }
      }
      if (b.recovery) setCode(b.recovery);
      else window.location.assign('/workspace');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccessLayout>
      <div className="account-form">
        <div className="eyebrow">YOUR COMPLIANCE WORKSPACE</div>
        <h1>
          {mode === 'register'
            ? 'Create your workspace'
            : mode === 'reset'
              ? 'Recover your account'
              : 'Welcome Back'}
        </h1>
        <p>
          {mode === 'reset'
            ? 'Use the recovery code saved when you registered.'
            : mode === 'register'
              ? 'Bring your team, deadlines and compliance records together.'
              : 'Sign in to manage your company’s compliance calendar.'}
        </p>
        {code ? (
          <>
            <h3>Save your new account recovery code</h3>
            <p>
              This code can reset your password. Store it securely. It is shown
              only once.
            </p>
            <pre className="recovery">{code}</pre>
            <Button
              onClick={() =>
                (window.location.href =
                  mode === 'reset' ? '/login' : '/workspace?view=My%20Company')
              }
            >
              I saved my recovery code
            </Button>
          </>
        ) : (
          <form onSubmit={handleSubmit(submit)}>
            {(mode === 'register'
              ? [
                  'company',
                  'name',
                  'mobile',
                  'designation',
                  'email',
                  'password',
                ]
              : mode === 'reset'
                ? ['email', 'recovery', 'password']
                : ['email', 'password']
            ).map((name) => (
              <label key={name}>
                {
                  (
                    {
                      company: 'Company name',
                      name: 'Your name',
                      mobile: 'Mobile',
                      designation: 'Designation',
                      email: 'Email',
                      password: mode === 'reset' ? 'New password' : 'Password',
                      recovery: 'Account recovery code',
                    } as any
                  )[name]
                }
                <div className={name === 'password' ? 'password-field' : ''}>
                  <input
                    {...register(name as any)}
                    type={
                      name === 'password'
                        ? showPassword
                          ? 'text'
                          : 'password'
                        : name === 'email'
                          ? 'email'
                          : name === 'mobile'
                            ? 'tel'
                            : 'text'
                    }
                    required={name !== 'designation'}
                    autoComplete={
                      name === 'password'
                        ? mode === 'login'
                          ? 'current-password'
                          : 'new-password'
                        : name === 'email'
                          ? 'email'
                          : 'off'
                    }
                  />
                  {name === 'password' && (
                    <button
                      type="button"
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
                {(errors as any)[name] && (
                  <small className="error">
                    {(errors as any)[name].message}
                  </small>
                )}
              </label>
            ))}
            {mode === 'login' && (
              <div>
                <div className="auth-options">
                  <label>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    Remember me
                  </label>
                  <a href="/forgot-password">Forgot password?</a>
                </div>
                <small className="remember-note">
                  Saves your email on this device.
                </small>
              </div>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy
                ? 'Please wait…'
                : mode === 'register'
                  ? 'Create account'
                  : mode === 'reset'
                    ? 'Reset password'
                    : 'Sign In'}
            </Button>
          </form>
        )}
        <div className="auth-links">
          {mode === 'login' && <span>Don’t have an account?</span>}
          <a href={mode === 'login' ? '/register' : '/login'}>
            {mode === 'login' ? 'Create Account' : 'Back to sign in'}
          </a>
        </div>
        {mode === 'reset' && (
          <small>
            Use the recovery code saved at registration to reset your password.
          </small>
        )}
      </div>
    </AccessLayout>
  );
}
