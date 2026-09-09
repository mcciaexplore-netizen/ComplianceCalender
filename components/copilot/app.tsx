'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  History,
  ChartNoAxesCombined,
  Settings,
  ShieldCheck,
  Users,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  ArrowRight,
  Play,
  LoaderCircle,
  Check,
  LockKeyhole,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  Workspace,
  Consultation,
  Source,
  Scenario,
} from '@/lib/copilot/types';
import { scenarios } from '@/lib/copilot/types';
import {
  api,
  Context,
  Logo,
  Waveform,
  initials,
  Modal,
  Loading,
  dateKey,
  useApp,
} from './shared';
import Dashboard from './dashboard';
import {
  ConsultationsPage,
  KnowledgePage,
  AnalyticsPage,
  SettingsPage,
  TeamPage,
} from './pages';
import LiveWorkspace from './live';
import './copilot.css';
import './workspace.css';
import './readability.css';
const navigation = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'consultations', name: "Today's consultations", icon: CalendarDays },
  { id: 'knowledge', name: 'Knowledge base', icon: BookOpen },
  { id: 'history', name: 'History', icon: History },
  { id: 'analytics', name: 'Analytics', icon: ChartNoAxesCombined },
  { id: 'team', name: 'Team & access', icon: Users },
  { id: 'settings', name: 'Settings', icon: Settings },
];
export default function Copilot() {
  const [data, setData] = useState<Workspace | null>(null),
    [checking, setChecking] = useState(true),
    [page, setPage] = useState('dashboard'),
    [liveId, setLiveId] = useState<string | null>(null),
    [toast, setToast] = useState(''),
    [demo, setDemo] = useState(false),
    [schedule, setSchedule] = useState(false),
    [selectedSource, setSource] = useState<Source | null>(null),
    [consent, setConsent] = useState<Consultation | null>(null),
    [busy, setBusy] = useState(false),
    [theme, setTheme] = useState('light');
  const notify = useCallback((s: string) => setToast(s), []);
  const refresh = useCallback(async () => {
    setData(await api<Workspace>('workspace'));
  }, []);
  useEffect(() => {
    const stored = localStorage.getItem('sme-theme');
    if (stored === 'dark') setTheme('dark');
    const expired = () => {
      setData(null);
      setLiveId(null);
    };
    window.addEventListener('copilot:expired', expired);
    refresh()
      .catch(() => {})
      .finally(() => setChecking(false));
    return () => window.removeEventListener('copilot:expired', expired);
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.copilotTheme = theme;
    return () => {
      delete document.documentElement.dataset.copilotTheme;
    };
  }, [theme]);
  const view = (name: string) => {
    setPage(name);
    setLiveId(null);
    const url = new URL(window.location.href);
    url.searchParams.set('view', name);
    url.searchParams.delete('consultation');
    window.history.replaceState({}, '', url);
  };
  const openLive = (id: string) => {
    setLiveId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('consultation', id);
    window.history.replaceState({}, '', url);
  };
  useEffect(() => {
    if (!data) return;
    const url = new URL(window.location.href),
      id = url.searchParams.get('consultation'),
      v = url.searchParams.get('view');
    if (id && data.consultations.some((c) => c.id === id)) setLiveId(id);
    else if (v && navigation.some((n) => n.id === v)) setPage(v);
  }, [!!data]);
  const join = async (c: Consultation) => {
    try {
      if (
        data?.user.role === 'Supervisor' ||
        ['Completed', 'Cancelled', 'Live'].includes(c.status)
      ) {
        openLive(c.id);
        return;
      }
      if (!c.demo) {
        setConsent(c);
        return;
      }
      await api(`consultations/${c.id}/start`, { consent: true });
      await refresh();
      openLive(c.id);
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const startDemo = async (scenario: Scenario) => {
    if (!data) return;
    setBusy(true);
    try {
      const c = await api<Consultation>('consultations', {
        scenario,
        demo: true,
        consultant_id: data.consultants.find((c) => c.active)?.id,
      });
      await api(`consultations/${c.id}/start`, { consent: true });
      setDemo(false);
      await refresh();
      openLive(c.id);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const toggleTheme = () =>
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light';
      localStorage.setItem('sme-theme', next);
      return next;
    });
  const signout = async () => {
    try {
      await api('auth', { action: 'logout' });
      setData(null);
      setLiveId(null);
    } catch (e) {
      notify((e as Error).message);
    }
  };
  return (
    <div className={'cp ' + (theme === 'dark' ? 'cp-dark' : '')}>
      {checking ? (
        <Loading />
      ) : !data ? (
        <Auth onReady={refresh} />
      ) : (
        <Context.Provider
          value={{
            data,
            refresh,
            notify,
            view,
            join,
            openDemo: () => setDemo(true),
            openSchedule: () => setSchedule(true),
            source: setSource,
            theme,
            toggleTheme,
          }}
        >
          <aside className="cp-nav">
            <Logo />
            <div className="cp-org">
              <span className="cp-org-icon">M</span>
              <span>
                SME Helpline<small>{data.user.role} workspace</small>
              </span>
            </div>
            <span className="cp-nav-label">WORKSPACE</span>
            <nav>
              {navigation
                .filter((n) => n.id !== 'team' || data.user.role === 'Admin')
                .map((n) => (
                  <button
                    title={n.name}
                    key={n.id}
                    className={!liveId && page === n.id ? 'active' : ''}
                    onClick={() => view(n.id)}
                  >
                    <n.icon size={18} />
                    {n.name}
                    {n.id === 'consultations' && (
                      <em>
                        {
                          data.consultations.filter(
                            (c) =>
                              dateKey(c.start) === dateKey() &&
                              !['Completed', 'Cancelled'].includes(c.status),
                          ).length
                        }
                      </em>
                    )}
                  </button>
                ))}
            </nav>
            <div className="cp-nav-bottom">
              <div className="cp-private">
                <ShieldCheck size={20} />
                <b>A little help. A bigger impact.</b>
                <p>Your private partner in every client conversation.</p>
                <span>
                  <i />{' '}
                  {data.user.demo
                    ? 'Isolated simulation workspace'
                    : 'Private consultation workspace'}
                </span>
              </div>
              <div className="cp-person">
                <span className="cp-avatar">{initials(data.user.name)}</span>
                <span>
                  {data.user.name}
                  <small>{data.user.role}</small>
                </span>
                <button
                  className="cp-icon-btn"
                  onClick={signout}
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </aside>
          <div className="cp-body">
            <header className="cp-top">
              <div>
                Workspace <ChevronRight size={14} />{' '}
                <b>
                  {liveId
                    ? 'Live consultation'
                    : navigation.find((n) => n.id === page)?.name}
                </b>
              </div>
              <div>
                {data.user.demo && (
                  <span className="cp-demo-pill">DEMO WORKSPACE</span>
                )}
                <button
                  onClick={() =>
                    refresh()
                      .then(() => notify('Workspace refreshed.'))
                      .catch((e) => notify(e.message))
                  }
                  aria-label="Refresh workspace"
                >
                  <RefreshCw size={17} />
                </button>
                <button
                  onClick={toggleTheme}
                  aria-label={
                    theme === 'light'
                      ? 'Switch to dark mode'
                      : 'Switch to light mode'
                  }
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <span className="cp-avatar cp-avatar-sm">
                  {initials(data.user.name)}
                </span>
              </div>
            </header>
            {liveId ? (
              <LiveWorkspace key={liveId} id={liveId} />
            ) : (
              <main className="cp-main">
                {page === 'dashboard' ? (
                  <Dashboard />
                ) : page === 'consultations' ? (
                  <ConsultationsPage />
                ) : page === 'history' ? (
                  <ConsultationsPage history />
                ) : page === 'knowledge' ? (
                  <KnowledgePage />
                ) : page === 'analytics' ? (
                  <AnalyticsPage />
                ) : page === 'team' ? (
                  <TeamPage />
                ) : (
                  <SettingsPage />
                )}
              </main>
            )}
          </div>
          <Modal
            open={demo}
            title="Start a demo consultation"
            description="Choose a scenario. Simulated speech and source-based guidance will arrive in real time."
            close={() => setDemo(false)}
            wide
          >
            <div className="cp-scenario-grid">
              {scenarios.map((s, i) => (
                <button
                  key={s.id}
                  disabled={busy}
                  onClick={() => startDemo(s.id)}
                >
                  <span className="cp-scenario-num">0{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                  <small>
                    {s.language}
                    <Play size={13} />
                  </small>
                </button>
              ))}
            </div>
            <div className="cp-info">
              <ShieldCheck size={15} /> Fictional client records and training
              guidance. No external AI key is needed.
            </div>
          </Modal>
          <Modal
            open={!!consent}
            title="Ready to join the consultation?"
            description="Confirm that all participants have agreed to transcription and AI assistance."
            close={() => setConsent(null)}
          >
            <p className="cp-form-note">
              The meeting area provides a local preview. Connect your
              organization's meeting provider for a remote call.
            </p>
            <Button
              disabled={busy}
              onClick={async () => {
                if (!consent) return;
                setBusy(true);
                try {
                  await api(`consultations/${consent.id}/start`, {
                    consent: true,
                  });
                  openLive(consent.id);
                  setConsent(null);
                  await refresh();
                } catch (e) {
                  notify((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check size={16} /> Consent confirmed · Join
            </Button>
          </Modal>
          {schedule && <ScheduleModal close={() => setSchedule(false)} />}
          <Modal
            open={!!selectedSource}
            title={selectedSource?.title || 'Source document'}
            description="Review the source before sharing advice with the client."
            close={() => setSource(null)}
            wide
          >
            {selectedSource && (
              <>
                <div className="cp-source-meta">
                  <span>{selectedSource.section}</span>
                  <span>Updated {dateKey(selectedSource.updated)}</span>
                </div>
                <div className="cp-source-excerpt">
                  {selectedSource.excerpt}
                </div>
                <small>{selectedSource.source}</small>
                <Button
                  variant="outline"
                  render={
                    <a
                      href={`/api/copilot/knowledge/${selectedSource.document_id}/download`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <BookOpen size={15} /> Open source document
                </Button>
              </>
            )}
          </Modal>
        </Context.Provider>
      )}
      {toast && (
        <div className="cp-toast" role="status" onClick={() => setToast('')}>
          {toast}
        </div>
      )}
    </div>
  );
}
function Auth({ onReady }: { onReady: () => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'register'>('login'),
    [busy, setBusy] = useState(''),
    [error, setError] = useState('');
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setBusy(mode);
    const b = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api('auth', { action: mode, ...b });
      await onReady();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };
  return (
    <div className="cp-auth">
      <div className="cp-auth-story">
        <Logo />
        <div>
          <span className="cp-eyebrow">
            THE PARTNER BESIDE EVERY CONSULTANT
          </span>
          <h1>
            Your expertise.
            <br />
            <span>Amplified.</span>
          </h1>
          <p>
            Stay in the conversation.
            <br />
            Let your copilot find the insight.
          </p>
          <Waveform />
          <div className="cp-auth-features">
            {[
              'Live, multilingual transcription',
              'Answers grounded in your trusted knowledge',
              'A private workspace, just for consultants',
            ].map((t) => (
              <div key={t}>
                <Check size={16} />
                {t}
              </div>
            ))}
          </div>
        </div>
        <small>SME HELPLINE AI COPILOT · BUILT FOR HUMAN CONNECTION</small>
      </div>
      <div className="cp-auth-form">
        <div>
          <span className="cp-icon-tile">
            <LockKeyhole size={23} />
          </span>
          <h2>
            {mode === 'login'
              ? 'Welcome to your workspace.'
              : 'Build your helpline workspace.'}
          </h2>
          <p>
            {mode === 'login'
              ? 'Sign in to make your next consultation count.'
              : 'Create your organization and invite your consulting team.'}
          </p>
          <form onSubmit={submit}>
            {mode === 'register' && (
              <>
                <label>
                  Your name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </label>
                <label>
                  Organization
                  <input
                    name="organization"
                    autoComplete="organization"
                    required
                    maxLength={150}
                  />
                </label>
              </>
            )}
            <label>
              Work email
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@organization.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                minLength={12}
                maxLength={128}
                placeholder="At least 12 characters"
                required
              />
            </label>
            {error && (
              <div className="cp-error" role="alert">
                {error}
              </div>
            )}
            <Button type="submit" disabled={!!busy}>
              {busy === mode ? (
                <LoaderCircle className="cp-spin" size={16} />
              ) : null}
              {mode === 'login' ? 'Sign in' : 'Create workspace'}
              <ArrowRight size={16} />
            </Button>
          </form>
          <button
            className="cp-auth-switch"
            onClick={() => {
              setError('');
              setMode((m) => (m === 'login' ? 'register' : 'login'));
            }}
          >
            {mode === 'login'
              ? 'New organization? Create a workspace'
              : 'Already have an account? Sign in'}
          </button>
          <div className="cp-auth-divider">
            <span>OR EXPLORE THE EXPERIENCE</span>
          </div>
          <Button
            variant="outline"
            disabled={!!busy}
            onClick={async () => {
              setBusy('demo');
              setError('');
              try {
                await api('auth', { action: 'demo' });
                await onReady();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy('');
              }
            }}
          >
            {busy === 'demo' ? (
              <LoaderCircle className="cp-spin" size={16} />
            ) : (
              <Play size={15} />
            )}{' '}
            Explore demo workspace <ArrowRight size={15} />
          </Button>
          <small className="cp-auth-demo-note">
            Try 6 scenarios with your own isolated demo data.
            <br />
            No account or API keys required.
          </small>
          <div className="cp-auth-trust">
            <ShieldCheck size={15} /> Private by design. Human expertise at the
            center.
          </div>
        </div>
      </div>
    </div>
  );
}
function ScheduleModal({ close }: { close: () => void }) {
  const { data, refresh, notify } = useApp();
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      await api('consultations', {
        ...b,
        start: new Date(String(b.start)).toISOString(),
        end: new Date(String(b.end)).toISOString(),
        demo: !!data.user.demo,
      });
      await refresh();
      notify('Consultation scheduled.');
      close();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      title="Schedule a consultation"
      description="Give the consultant the context they need before the conversation begins."
      close={close}
      wide
    >
      <form className="cp-form-grid" onSubmit={submit}>
        <label>
          Client name
          <input name="client" required maxLength={150} />
        </label>
        <label>
          Company name
          <input name="company" required maxLength={200} />
        </label>
        <label>
          Topic
          <select name="scenario">
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Consultant
          <select name="consultant_id" required>
            {data.consultants
              .filter(
                (c) =>
                  c.active &&
                  (data.user.role !== 'Consultant' ||
                    c.user_id === data.user.id),
              )
              .map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Start time (your local time)
          <input type="datetime-local" name="start" required />
        </label>
        <label>
          End time (your local time)
          <input type="datetime-local" name="end" required />
        </label>
        <label>
          Industry
          <input name="industry" maxLength={100} />
        </label>
        <label>
          Location
          <input name="location" maxLength={100} />
        </label>
        <label>
          Conversation language
          <select name="language">
            <option>Auto</option>
            <option>English</option>
            <option>Hindi</option>
            <option>Marathi</option>
          </select>
        </label>
        <div className="cp-form-footer">
          <Button variant="outline" type="button" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={busy || !data.consultants.some((c) => c.active)}
          >
            {busy ? 'Saving…' : 'Schedule consultation'}
          </Button>
        </div>
        {!data.consultants.some((c) => c.active) && (
          <p>Add a consultant in Team & access first.</p>
        )}
      </form>
    </Modal>
  );
}
