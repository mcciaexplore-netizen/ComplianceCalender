'use client';
import { useEffect, useState, type ComponentType } from 'react';
export default function Page() {
  const [App, setApp] = useState<ComponentType | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    import('@/components/workspace')
      .then((module) => {
        if (active) setApp(() => module.default);
      })
      .catch(() => {
        if (active)
          setError(
            'The workspace could not load. Refresh this page to try again.',
          );
      });
    return () => {
      active = false;
    };
  }, []);
  return App ? (
    <App />
  ) : (
    <main className="auth">
      <img src="/assets/mccia-logo.png" alt="MCCIA" width="135" />
      <h1>Compliance Mitra</h1>
      <p>{error || 'Opening your compliance workspace…'}</p>
      {error && <a href="/workspace">Reload workspace</a>}
    </main>
  );
}
