'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
    [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
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
      if (b.recovery) setCode(b.recovery);
      else window.location.assign('/workspace');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth">
      <a href="/">
        <img src="/assets/mccia-logo.png" alt="MCCIA" width="135" />
      </a>
      <div className="eyebrow">COMPLIANCE MITRA</div>
      <h1>
        {mode === 'register'
          ? 'Create your workspace'
          : mode === 'reset'
            ? 'Recover your account'
            : 'Welcome back'}
      </h1>
      <p>
        {mode === 'reset'
          ? 'Use the recovery code saved when you registered.'
          : 'Your company’s compliance, connected.'}
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
            ? ['company', 'name', 'mobile', 'designation', 'email', 'password']
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
              <input
                {...register(name as any)}
                type={
                  name === 'password'
                    ? 'password'
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
              {(errors as any)[name] && (
                <small className="error">{(errors as any)[name].message}</small>
              )}
            </label>
          ))}
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
                  : 'Sign in'}
          </Button>
        </form>
      )}
      <div className="auth-links">
        <a href={mode === 'login' ? '/register' : '/login'}>
          {mode === 'login' ? 'Create an account' : 'Back to sign in'}
        </a>
        {mode === 'login' && <a href="/forgot-password">Forgot password?</a>}
      </div>
      <small>
        Secure recovery uses your saved recovery code. Email delivery is not
        configured.
      </small>
    </main>
  );
}
