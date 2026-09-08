'use client';
import { useEffect, useState, type ComponentType } from 'react';
import { WorkspaceLoading } from '@/components/access-layout';
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
  return App ? <App /> : <WorkspaceLoading error={error} />;
}
