import type { ReactNode } from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { professionalDisclaimer } from '@/components/compliance-ui';
export default function AccessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="access-page">
      <main className="access-main">
        <section className="access-introduction" aria-labelledby="access-title">
          <a
            href="/"
            className="access-brand"
            aria-label="MCCIA Compliance Calendar home"
          >
            <span className="access-logo">
              <img
                src="/assets/mccia-logo.png"
                alt="MCCIA"
                width="112"
                height="40"
              />
            </span>
            <span>
              <strong>Compliance Calendar</strong>
              <small>Compliance Management</small>
            </span>
          </a>
          <div className="access-story">
            <div className="eyebrow">YOUR BUSINESS. EVERY DEADLINE.</div>
            <h1 id="access-title">
              Stay Ahead of Every
              <br />
              Compliance Deadline.
            </h1>
            <p className="access-lead">
              Manage statutory deadlines, compliance tasks, documents and
              approvals from one place.
            </p>
            <ul className="access-feature-list">
              {[
                'Track every compliance deadline',
                'Assign responsibilities',
                'Upload filing evidence',
                'Review and approve submissions',
                'Never miss a critical renewal',
              ].map((text) => (
                <li key={text}>
                  <span>
                    <Check size={15} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="access-attribution">
            <ShieldCheck size={19} />
            <div>
              <b>Powered by MCCIA</b>
              <small>An MCCIA Digital Initiative</small>
            </div>
          </div>
        </section>
        <section
          className="access-form-region"
          aria-label="Open your workspace"
        >
          <div className="access-form">{children}</div>
          <p className="access-support">
            Need assistance?{' '}
            <a
              href="https://www.mcciapune.com/"
              target="_blank"
              rel="noreferrer"
            >
              Connect with MCCIA <ArrowRight size={13} />
            </a>
          </p>
        </section>
      </main>
      <footer className="access-footer">
        <b>Compliance Calendar · Powered by MCCIA</b>
        <span>{professionalDisclaimer}</span>
      </footer>
    </div>
  );
}
export function WorkspaceLoading({ error = '' }: { error?: string }) {
  return (
    <AccessLayout>
      <div className="eyebrow">COMPLIANCE CALENDAR</div>
      <h2>{error ? 'Let’s reconnect' : 'Opening your workspace'}</h2>
      <p role={error ? 'alert' : undefined}>
        {error ||
          'Loading your company, calendar and assigned work. This will only take a moment.'}
      </p>
      {error ? (
        <a className="access-retry" href="/workspace">
          Reload workspace <ArrowRight size={16} />
        </a>
      ) : (
        <output className="access-loading" aria-label="Loading workspace">
          <span />
        </output>
      )}
    </AccessLayout>
  );
}
