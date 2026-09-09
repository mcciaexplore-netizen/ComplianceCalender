'use client';
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Upload,
  FileText,
  BookOpen,
  Check,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  ArrowRight,
  Users,
  ShieldCheck,
  Sparkles,
  Activity,
  Download,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Globe,
  Database,
  Mic,
  Sun,
  Moon,
  UserRound,
  FolderPlus,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  useApp,
  api,
  dateKey,
  time,
  initials,
  Badge,
  ConsultationTable,
  Modal,
  Empty,
  SearchBox,
  duration,
} from './shared';
import type { Consultant, Language, Source } from '@/lib/copilot/types';
export function ConsultationsPage({ history = false }: { history?: boolean }) {
  const { data, openSchedule, join, notify, refresh } = useApp();
  const [q, setQ] = useState(''),
    [date, setDate] = useState(history ? '' : dateKey()),
    [status, setStatus] = useState('All'),
    [consultant, setConsultant] = useState('All'),
    [lang, setLang] = useState('All'),
    [industry, setIndustry] = useState('All'),
    [cards, setCards] = useState(!history);
  const items = data.consultations
    .filter(
      (c) =>
        (!date || dateKey(c.start) === date) &&
        (status === 'All' || c.status === status) &&
        (consultant === 'All' || c.consultant_id === consultant) &&
        (lang === 'All' || c.language === lang) &&
        (industry === 'All' ||
          data.companies.find((x) => x.id === c.company_id)?.industry ===
            industry) &&
        [c.client, c.company, c.topic]
          .join(' ')
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      history ? b.start.localeCompare(a.start) : a.start.localeCompare(b.start),
    );
  return (
    <>
      <div className="cp-page-title">
        <div>
          <div className="cp-overline">
            {history
              ? 'EVERY CONVERSATION, IN CONTEXT'
              : 'YOUR DAY, AT A GLANCE'}
          </div>
          <h1>{history ? 'Consultation history' : 'Your consultations'}</h1>
          <p>
            {history
              ? 'Revisit transcripts, recommendations, notes and next steps.'
              : 'A little preparation goes a long way. Here’s what’s ahead.'}
          </p>
        </div>
        {!history && data.user.role !== 'Supervisor' && (
          <Button onClick={openSchedule}>
            <Plus size={16} /> Schedule consultation
          </Button>
        )}
      </div>
      <div className="cp-filter-bar">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Search client, company or topic…"
        />
        <input
          type="date"
          aria-label="Consultation date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {['All', 'Upcoming', 'Waiting', 'Live', 'Completed', 'Cancelled'].map(
            (s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All statuses' : s}
              </option>
            ),
          )}
        </select>
        <select
          aria-label="Consultant"
          value={consultant}
          onChange={(e) => setConsultant(e.target.value)}
        >
          <option value="All">All consultants</option>
          {data.consultants.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className="cp-icon-btn"
          aria-label={cards ? 'Show table' : 'Show cards'}
          onClick={() => setCards((v) => !v)}
        >
          {cards ? <List size={18} /> : <LayoutGrid size={18} />}
        </button>
      </div>
      {history && (
        <div className="cp-filter-secondary">
          <SlidersHorizontal size={15} />
          <select
            aria-label="Language"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          >
            {['All', 'Auto', 'English', 'Hindi', 'Marathi'].map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All languages' : s}
              </option>
            ))}
          </select>
          <select
            aria-label="Industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            <option value="All">All industries</option>
            {[...new Set(data.companies.map((c) => c.industry))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            className="cp-text-button"
            onClick={() => {
              setQ('');
              setDate('');
              setStatus('All');
              setConsultant('All');
              setLang('All');
              setIndustry('All');
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <div className="cp-results-caption">
        {items.length} consultation{items.length !== 1 ? 's' : ''}{' '}
        <span>All schedule times shown in IST</span>
      </div>
      {cards ? (
        <div className="cp-consultation-grid">
          {items.map((c, i) => (
            <article className="cp-panel cp-consultation-card" key={c.id}>
              <div className="cp-card-top">
                <span className={'cp-avatar cp-tone-' + (i % 4)}>
                  {initials(c.client)}
                </span>
                <Badge status={c.status} />
              </div>
              <h2>{c.client}</h2>
              <p>{c.company}</p>
              <div className="cp-topic-tag">{c.topic}</div>
              <div className="cp-card-details">
                <span>
                  <CalendarDays size={14} />
                  {dateKey(c.start)}
                </span>
                <span>
                  <Clock3 size={14} />
                  {time(c.start)} – {time(c.end)} IST
                </span>
                <span>
                  <UserRound size={14} />
                  {data.consultants.find((x) => x.id === c.consultant_id)?.name}
                </span>
                <span>
                  <Globe size={14} />
                  {c.language === 'Auto' ? 'Auto-detect language' : c.language}
                </span>
              </div>
              <div className="cp-card-actions">
                <Button
                  variant={
                    ['Waiting', 'Live'].includes(c.status)
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() => join(c)}
                >
                  {c.status === 'Completed'
                    ? 'Review consultation'
                    : c.status === 'Cancelled'
                      ? 'View details'
                      : data.user.role === 'Supervisor'
                        ? 'Monitor consultation'
                        : 'Join consultation'}
                  <ArrowRight size={15} />
                </Button>
                {data.user.role === 'Admin' &&
                  ['Upcoming', 'Waiting'].includes(c.status) && (
                    <button
                      className="cp-text-button"
                      onClick={async () => {
                        try {
                          await api(`consultations/${c.id}/cancel`, {});
                          await refresh();
                          notify('Consultation cancelled.');
                        } catch (e) {
                          notify((e as Error).message);
                        }
                      }}
                    >
                      Cancel
                    </button>
                  )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="cp-panel">
          <ConsultationTable items={items} />
        </section>
      )}
      {cards && !items.length && (
        <Empty
          title="No consultations match"
          detail="Try another date or clear your filters to see more conversations."
        />
      )}
    </>
  );
}
export function KnowledgePage() {
  const { data, notify, refresh, source } = useApp();
  const [q, setQ] = useState(''),
    [category, setCategory] = useState('All'),
    [uploading, setUploading] = useState(false),
    [busy, setBusy] = useState(false),
    [newCategory, setNewCategory] = useState(false),
    [results, setResults] = useState<Source[] | null>(null),
    [searching, setSearching] = useState(false);
  useEffect(() => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setSearching(true);
      api<Source[]>('knowledge/search?q=' + encodeURIComponent(q))
        .then((r) => {
          if (!cancelled) setResults(r);
        })
        .catch((e) => {
          if (!cancelled) notify(e.message);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, notify]);
  const docs = data.knowledge.filter(
    (d) =>
      (category === 'All' || d.category === category) &&
      (data.user.role === 'Admin' || d.status === 'Approved') &&
      (results === null || results.some((r) => r.document_id === d.id)),
  );
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api('knowledge/upload', form);
      await refresh();
      setUploading(false);
      notify(
        'Document processed. Review it and approve it for use by the copilot.',
      );
    } catch (e) {
      notify((e as Error).message);
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="cp-page-title">
        <div>
          <div className="cp-overline">THE FOUNDATION OF GOOD ADVICE</div>
          <h1>Trusted knowledge, within reach.</h1>
          <p>
            Your organization’s source of truth, ready for the next
            conversation.
          </p>
        </div>
        {data.user.role === 'Admin' && (
          <div className="cp-row">
            <Button variant="outline" onClick={() => setNewCategory(true)}>
              <FolderPlus size={15} /> Category
            </Button>
            <Button onClick={() => setUploading(true)}>
              <Upload size={15} /> Upload document
            </Button>
          </div>
        )}
      </div>
      {!!data.user.demo && (
        <div className="cp-info">
          <ShieldCheck size={16} /> Demo library: these 50 training documents
          illustrate the workflow. They are not official scheme or legal
          sources.
        </div>
      )}
      <div className="cp-knowledge-layout">
        <aside className="cp-panel cp-category-list">
          <h3>Collections</h3>
          {['All', ...data.categories].map((c) => (
            <button
              key={c}
              className={category === c ? 'active' : ''}
              onClick={() => setCategory(c)}
            >
              <BookOpen size={15} />
              <span>{c === 'All' ? 'All documents' : c}</span>
              <small>
                {
                  data.knowledge.filter(
                    (d) =>
                      (c === 'All' || d.category === c) &&
                      (data.user.role === 'Admin' || d.status === 'Approved'),
                  ).length
                }
              </small>
            </button>
          ))}
          <div className="cp-library-note">
            <ShieldCheck size={22} />
            <p>Only approved documents are used to generate suggestions.</p>
          </div>
        </aside>
        <div>
          <div className="cp-filter-bar">
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="Search knowledge base…"
            />
            <span className="cp-muted">
              {searching ? 'Searching…' : `${docs.length} documents`}
            </span>
          </div>
          <div className="cp-document-grid">
            {docs.map((d) => (
              <article className="cp-panel cp-document" key={d.id}>
                <div className="cp-card-top">
                  <span className="cp-file-icon">
                    <FileText size={23} />
                    <small>{d.type}</small>
                  </span>
                  <Badge status={d.status} />
                </div>
                <small className="cp-doc-category">{d.category}</small>
                <h3>{d.title}</h3>
                <p>
                  {results
                    ?.find((r) => r.document_id === d.id)
                    ?.excerpt.slice(0, 160) ||
                    d.content.split('\n').slice(2, 5).join(' ').slice(0, 160) ||
                    d.error ||
                    'Awaiting processing'}
                </p>
                <div className="cp-document-meta">
                  Updated {dateKey(d.updated)}
                  <span>v{d.version}</span>
                </div>
                <div className="cp-card-actions">
                  <button
                    className="cp-text-button"
                    onClick={() =>
                      source({
                        id: d.id,
                        document_id: d.id,
                        title: d.title,
                        section: 'Full document',
                        updated: d.updated,
                        excerpt: d.content || d.error || '',
                        source: d.source,
                        score: 1,
                      })
                    }
                  >
                    View source <ArrowUpRight size={14} />
                  </button>
                  {data.user.role === 'Admin' &&
                    ['Draft', 'Approved'].includes(d.status) && (
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            await api(`knowledge/${d.id}/status`, {
                              status:
                                d.status === 'Approved' ? 'Draft' : 'Approved',
                            });
                            await refresh();
                            notify(
                              d.status === 'Approved'
                                ? 'Document removed from approved knowledge.'
                                : 'Document approved.',
                            );
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        {d.status === 'Approved' ? 'Unapprove' : 'Approve'}
                      </Button>
                    )}
                </div>
              </article>
            ))}
          </div>
          {!docs.length && (
            <Empty
              title="No sources found"
              detail={
                q
                  ? 'Try a broader question or another collection.'
                  : 'Upload a document and approve it to make it available to your team.'
              }
            />
          )}
        </div>
      </div>
      <Modal
        open={uploading}
        title="Add to your knowledge library"
        description="Upload a source, review the extracted content, then approve it for consultation use."
        close={() => {
          if (!busy) setUploading(false);
        }}
        wide
      >
        <form onSubmit={submit} className="cp-form-grid">
          <label className="cp-upload-zone">
            <Upload size={24} />
            <b>Choose a knowledge document</b>
            <small>PDF, DOCX, XLSX, CSV or TXT · up to 10 MB</small>
            <input
              name="file"
              type="file"
              accept=".pdf,.docx,.xlsx,.csv,.txt"
              required
            />
          </label>
          <label>
            Document title
            <input
              name="title"
              placeholder="Defaults to the filename"
              maxLength={200}
            />
          </label>
          <label>
            Category
            <select name="category">
              {data.categories.length ? (
                data.categories.map((c) => <option key={c}>{c}</option>)
              ) : (
                <option>General guidance</option>
              )}
            </select>
          </label>
          <label>
            Source / official URL
            <input
              name="source"
              placeholder="Original source or issuing organization"
              required
              maxLength={1000}
            />
          </label>
          <label>
            Government department
            <input name="department" maxLength={150} />
          </label>
          <label>
            Scheme / service
            <input name="scheme" maxLength={150} />
          </label>
          <label>
            State
            <input name="state" defaultValue="All states" maxLength={100} />
          </label>
          <label>
            Industry
            <input
              name="industry"
              defaultValue="All industries"
              maxLength={100}
            />
          </label>
          <label>
            Effective date
            <input type="date" name="effective_date" />
          </label>
          <label>
            Version
            <input name="version" defaultValue="1.0" required maxLength={50} />
          </label>
          <div className="cp-form-footer">
            <Button type="submit" disabled={busy}>
              {busy ? 'Extracting and indexing…' : 'Upload & process'}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={newCategory}
        title="New knowledge collection"
        close={() => setNewCategory(false)}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get('name'));
            try {
              await api('categories', { name });
              await refresh();
              setNewCategory(false);
              notify('Collection created.');
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        >
          <label>
            Collection name
            <input name="name" required minLength={2} maxLength={100} />
          </label>
          <Button type="submit">Create collection</Button>
        </form>
      </Modal>
    </>
  );
}
export function AnalyticsPage() {
  const { data } = useApp();
  const consultations = data.consultations,
    m = data.metrics,
    complete = consultations.filter((c) => c.status === 'Completed'),
    average = complete.length
      ? Math.round(
          complete.reduce((n, c) => n + (c.duration || 0), 0) / complete.length,
        )
      : 0;
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + i);
    const key = dateKey(date),
      cs = consultations.filter((c) => dateKey(c.start) === key);
    return {
      day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      Consultations: cs.length,
      Completed: cs.filter((c) => c.status === 'Completed').length,
    };
  });
  const topics = [...new Set(consultations.map((c) => c.topic))].map((t) => ({
    name: t.replace(' enquiry', '').replace(' assistance', ''),
    count: consultations.filter((c) => c.topic === t).length,
  }));
  return (
    <>
      <div className="cp-page-title">
        <div>
          <div className="cp-overline">
            BETTER CONVERSATIONS, MEASURABLE IMPACT
          </div>
          <h1>Consultation insights</h1>
          <p>
            See how your team and copilot are helping businesses move forward.
          </p>
        </div>
        <span className="cp-period">
          <CalendarDays size={15} /> All consultation history
        </span>
      </div>
      <section className="cp-stats cp-stats-analytics">
        {[
          {
            title: 'Total consultations',
            value: consultations.length,
            sub: `${consultations.filter((c) => c.status === 'Live').length} live right now`,
          },
          {
            title: 'Completed',
            value: complete.length,
            sub: `Average ${duration(average)}`,
          },
          {
            title: 'AI suggestions',
            value: m.suggestions,
            sub: `${m.accepted} marked helpful`,
          },
          {
            title: 'Acceptance rate',
            value:
              (m.feedback ? Math.round((m.accepted / m.feedback) * 100) : 0) +
              '%',
            sub: `${m.feedback} feedback responses`,
          },
          {
            title: 'Average AI latency',
            value: (m.latency / 1000).toFixed(2) + 's',
            sub: 'Measured from retrieval to answer',
          },
          {
            title: 'Retrieval success',
            value: m.retrieval_rate + '%',
            sub: 'Suggestions with supporting sources',
          },
          {
            title: 'Not helpful / incorrect',
            value: `${m.rejected} / ${m.incorrect}`,
            sub: 'Review these knowledge gaps',
          },
          {
            title: 'Needs verification',
            value: m.verification,
            sub: 'Flagged by consultants',
          },
        ].map((s) => (
          <article key={s.title}>
            <div>
              {s.title}
              <Activity size={16} />
            </div>
            <strong>{s.value}</strong>
            <small>{s.sub}</small>
          </article>
        ))}
      </section>
      <div className="cp-analytics-grid">
        <section className="cp-panel">
          <div className="cp-section-title">
            <div>
              <h2>Conversations over time</h2>
              <p>The last seven days</p>
            </div>
          </div>
          <div className="cp-chart">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={days}
                margin={{ top: 8, right: 22, left: -22, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="cp-chart-fill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3264e1" stopOpacity={0.2} />
                    <stop
                      offset="100%"
                      stopColor="#3264e1"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e9edf3" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#8995a9' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#8995a9' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="Consultations"
                  stroke="#3264e1"
                  strokeWidth={2.5}
                  fill="url(#cp-chart-fill)"
                />
                <Area
                  type="monotone"
                  dataKey="Completed"
                  stroke="#6abfa3"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="cp-panel">
          <div className="cp-section-title">
            <div>
              <h2>What businesses ask about</h2>
              <p>Consultations by topic</p>
            </div>
          </div>
          <div className="cp-topic-bars">
            {topics.map((t, i) => (
              <div key={t.name}>
                <div>
                  <span>{t.name}</span>
                  <b>{t.count}</b>
                </div>
                <div className="cp-bar-track">
                  <i
                    style={{
                      width: `${(t.count / Math.max(1, ...topics.map((x) => x.count))) * 100}%`,
                      background: [
                        '#527dea',
                        '#81a1f3',
                        '#7cb9b1',
                        '#b1a1de',
                        '#91b6d9',
                        '#dbba89',
                      ][i % 6],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="cp-panel">
          <div className="cp-section-title">
            <div>
              <h2>Consultant activity</h2>
              <p>Visible consultation assignments</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>CONSULTANT</th>
                <th>CONSULTATIONS</th>
                <th>COMPLETED</th>
                <th>LIVE</th>
              </tr>
            </thead>
            <tbody>
              {data.consultants.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="cp-client-cell">
                      <span className="cp-avatar">{initials(c.name)}</span>
                      <b>{c.name}</b>
                    </div>
                  </td>
                  <td>
                    {
                      consultations.filter((x) => x.consultant_id === c.id)
                        .length
                    }
                  </td>
                  <td>
                    {
                      consultations.filter(
                        (x) =>
                          x.consultant_id === c.id && x.status === 'Completed',
                      ).length
                    }
                  </td>
                  <td>
                    {
                      consultations.filter(
                        (x) => x.consultant_id === c.id && x.status === 'Live',
                      ).length
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="cp-panel">
          <div className="cp-section-title">
            <div>
              <h2>AI quality & knowledge gaps</h2>
              <p>Feedback that helps improve the next answer</p>
            </div>
          </div>
          <div className="cp-quality-bars">
            {[
              ['Helpful', m.accepted, '#6abfa3'],
              ['Not helpful', m.rejected, '#e5b765'],
              ['Incorrect', m.incorrect, '#dc8888'],
              ['Needs verification', m.verification, '#9b9be0'],
            ].map(([label, value, color]) => (
              <div key={String(label)}>
                <span>
                  <i style={{ background: String(color) }} />
                  {label}
                </span>
                <b>{value}</b>
              </div>
            ))}
          </div>
          {data.gaps.length ? (
            <div className="cp-gap-list">
              {data.gaps.slice(0, 4).map((g, i) => (
                <div key={i}>
                  <AlertTriangle size={14} />
                  <span>
                    {g.question}
                    <small>{g.feedback}</small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No knowledge gaps flagged"
              detail="Incorrect and unhelpful answers will appear here for review."
            />
          )}
        </section>
      </div>
      <div className="cp-analytics-grid cp-extra-analytics">
        <section className="cp-panel">
          <div className="cp-section-title">
            <div>
              <h2>Languages in the conversation</h2>
              <p>Recorded transcript segments</p>
            </div>
          </div>
          <div className="cp-topic-bars">
            {data.language_usage.map((l) => (
              <div key={l.language}>
                <div>
                  <span>{l.language}</span>
                  <b>{l.count}</b>
                </div>
                <div className="cp-bar-track">
                  <i
                    style={{
                      width: `${(l.count / Math.max(1, ...data.language_usage.map((x) => x.count))) * 100}%`,
                      background: '#7b9ae2',
                    }}
                  />
                </div>
              </div>
            ))}
            {!data.language_usage.length && <p>No transcript segments yet.</p>}
          </div>
        </section>
        <section className="cp-panel">
          <div className="cp-section-title">
            <div>
              <h2>Most searched knowledge</h2>
              <p>Manual searches within this workspace</p>
            </div>
          </div>
          <div className="cp-topic-bars">
            {data.searches.map((s) => (
              <div key={s.topic}>
                <div>
                  <span>{s.topic}</span>
                  <b>{s.count}</b>
                </div>
              </div>
            ))}
            {!data.searches.length && (
              <p>
                Knowledge searches will appear here as your team uses the
                library.
              </p>
            )}
          </div>
        </section>
      </div>
      <section className="cp-panel cp-audit">
        <div className="cp-section-title">
          <div>
            <h2>Recent activity</h2>
            <p>Recorded workspace actions</p>
          </div>
        </div>
        {data.activity.map((a, i) => (
          <div key={i}>
            <span className="cp-avatar cp-avatar-sm">{initials(a.actor)}</span>
            <span>
              <b>{a.actor}</b> {a.action}
            </span>
            <small>{new Date(a.timestamp).toLocaleString('en-IN')}</small>
          </div>
        ))}
      </section>
    </>
  );
}
export function SettingsPage() {
  const { data, notify, refresh, theme, toggleTheme, view } = useApp();
  const [lang, setLang] = useState<Language>(data.user.settings.language),
    [auto, setAuto] = useState(data.user.settings.autoCopilot),
    [busy, setBusy] = useState(false);
  return (
    <>
      <div className="cp-page-title">
        <div>
          <div className="cp-overline">MAKE IT WORK FOR YOU</div>
          <h1>Your copilot, your preferences.</h1>
          <p>
            Keep assistance comfortable, clear and in the language you prefer.
          </p>
        </div>
      </div>
      <div className="cp-settings-grid">
        <section className="cp-panel cp-settings-card">
          <span className="cp-icon-tile">
            <Sparkles size={22} />
          </span>
          <h2>Consultant preferences</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api('settings', { language: lang, autoCopilot: auto });
                await refresh();
                notify('Preferences saved.');
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Response language
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Language)}
              >
                <option>Auto</option>
                <option>English</option>
                <option>Hindi</option>
                <option>Marathi</option>
              </select>
              <small>Auto follows the client’s detected language.</small>
            </label>
            <label className="cp-checkbox">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
              />
              <span>
                Start AI assistance automatically
                <small>
                  Generate suggestions when meaningful client questions are
                  detected.
                </small>
              </span>
            </label>
            <Button disabled={busy} type="submit">
              <Check size={16} />
              {busy ? 'Saving…' : 'Save preferences'}
            </Button>
          </form>
        </section>
        <section className="cp-panel cp-settings-card">
          <span className="cp-icon-tile">
            {theme === 'light' ? <Sun size={22} /> : <Moon size={22} />}
          </span>
          <h2>Appearance & privacy</h2>
          <p>Choose the workspace that’s easiest on your eyes.</p>
          <Button variant="outline" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}Switch
            to {theme === 'light' ? 'dark' : 'light'} mode
          </Button>
          <div className="cp-setting-line">
            <ShieldCheck size={18} />
            <span>
              Consultant-only assistance
              <small>
                Clients do not have access to transcripts or suggestions.
              </small>
            </span>
          </div>
          <div className="cp-setting-line">
            <Clock3 size={18} />
            <span>
              Automatic session timeout
              <small>30 minutes idle, with an 8-hour session limit.</small>
            </span>
          </div>
          <div className="cp-setting-line">
            <BookOpen size={18} />
            <span>
              Approved sources required
              <small>Unsupported answers are withheld for verification.</small>
            </span>
          </div>
        </section>
        <section className="cp-panel cp-settings-card">
          <span className="cp-icon-tile">
            <Activity size={22} />
          </span>
          <h2>Connection status</h2>
          <p>Live services are configured securely on the server.</p>
          {[
            {
              name: 'AI answer generation',
              active: data.providers.ai,
              icon: Sparkles,
            },
            {
              name: 'Speech transcription',
              active: data.providers.stt,
              icon: Mic,
            },
            {
              name: 'Knowledge embeddings',
              active: data.providers.embedding,
              icon: BookOpen,
            },
            { name: 'Persistent database', active: true, icon: Database },
          ].map((p) => (
            <div className="cp-setting-line" key={p.name}>
              <p.icon size={17} />
              <span>
                {p.name}
                <small>
                  {p.name === 'Persistent database'
                    ? data.providers.database
                    : p.active
                      ? 'Connected'
                      : 'Awaiting credentials'}
                </small>
              </span>
              <Badge status={p.active ? 'Connected' : 'Not configured'} />
            </div>
          ))}
          <div className="cp-info">
            Simulation works without external services. Speech Auto mode handles
            Hindi + English; select Marathi for Marathi conversations.
          </div>
        </section>
        <section className="cp-panel cp-settings-card">
          <span className="cp-icon-tile">
            <Users size={22} />
          </span>
          <h2>Account & workspace</h2>
          <div className="cp-setting-line">
            <span className="cp-avatar">{initials(data.user.name)}</span>
            <span>
              {data.user.name}
              <small>
                {data.user.demo ? 'Isolated demo account' : data.user.email}
              </small>
            </span>
            <Badge status={data.user.role} />
          </div>
          {!!data.user.demo ? (
            <>
              <p>Explore each role within this demo workspace.</p>
              <div className="cp-role-buttons">
                {['Consultant', 'Admin', 'Supervisor'].map((role) => (
                  <Button
                    variant={data.user.role === role ? 'default' : 'outline'}
                    key={role}
                    onClick={async () => {
                      try {
                        await api('auth', { action: 'demo-role', role });
                        await refresh();
                        view('dashboard');
                        notify(`Now viewing as ${role}.`);
                      } catch (e) {
                        notify((e as Error).message);
                      }
                    }}
                  >
                    {role}
                  </Button>
                ))}
              </div>
              <small>
                Role switching is available only for fictional demo accounts.
              </small>
            </>
          ) : (
            <p>
              {data.user.role === 'Admin'
                ? 'Manage consultant accounts in Team & access.'
                : 'Contact your workspace administrator to change your access.'}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
export function TeamPage() {
  const { data, notify, refresh } = useApp();
  const [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<Consultant | null>(null),
    [busy, setBusy] = useState(false);
  if (data.user.role !== 'Admin')
    return (
      <Empty
        title="Administrator access required"
        detail="Contact your administrator to manage team access."
      />
    );
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget),
      b = Object.fromEntries(form);
    setBusy(true);
    try {
      await api(
        'consultants',
        editing
          ? {
              ...b,
              action: 'update',
              id: editing.id,
              active: form.get('active') === 'on',
            }
          : b,
      );
      await refresh();
      setAdding(false);
      setEditing(null);
      notify(
        editing
          ? 'Consultant updated.'
          : 'Team member added. Share their sign-in details securely.',
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="cp-page-title">
        <div>
          <div className="cp-overline">HUMAN EXPERTISE, CONNECTED</div>
          <h1>Your consulting team</h1>
          <p>
            Manage profiles, expertise and access to your helpline workspace.
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus size={16} /> Add team member
        </Button>
      </div>
      <div className="cp-team-grid">
        {data.consultants.map((c) => (
          <article className="cp-panel cp-team-card" key={c.id}>
            <div className="cp-card-top">
              <span className="cp-avatar cp-avatar-lg">{initials(c.name)}</span>
              <Badge status={c.active ? 'Active' : 'Inactive'} />
            </div>
            <h2>{c.name}</h2>
            <p>{c.specialty}</p>
            <div className="cp-card-details">
              <span>
                <Globe size={15} />
                {c.languages}
              </span>
              <span>
                <CalendarDays size={15} />
                {
                  data.consultations.filter((x) => x.consultant_id === c.id)
                    .length
                }{' '}
                consultations
              </span>
            </div>
            <Button variant="outline" onClick={() => setEditing(c)}>
              Manage profile <ArrowUpRight size={14} />
            </Button>
          </article>
        ))}
      </div>
      {!data.consultants.length && (
        <Empty
          title="Build your team"
          detail="Add your first consultant to start scheduling consultations."
        />
      )}
      <Modal
        open={adding || !!editing}
        title={editing ? 'Manage consultant profile' : 'Add a team member'}
        description={
          editing
            ? 'Update expertise or disable access while retaining consultation history.'
            : 'Create an account with the appropriate workspace permissions.'
        }
        close={() => {
          setAdding(false);
          setEditing(null);
        }}
        wide
      >
        <form onSubmit={submit} className="cp-form-grid">
          <label>
            Name
            <input
              name="name"
              defaultValue={editing?.name}
              required
              minLength={2}
              maxLength={100}
            />
          </label>
          {!editing && (
            <>
              <label>
                Work email
                <input type="email" name="email" required />
              </label>
              <label>
                Initial password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
              <label>
                Role
                <select name="role">
                  <option>Consultant</option>
                  <option>Supervisor</option>
                  <option>Admin</option>
                </select>
              </label>
            </>
          )}
          <label>
            Specialty
            <input
              name="specialty"
              defaultValue={editing?.specialty || 'General advisory'}
              maxLength={150}
            />
          </label>
          <label>
            Languages
            <input
              name="languages"
              defaultValue={editing?.languages || 'English, Hindi, Marathi'}
              maxLength={150}
            />
          </label>
          {editing && (
            <label className="cp-checkbox">
              <input
                type="checkbox"
                name="active"
                defaultChecked={!!editing.active}
              />
              <span>Account active</span>
            </label>
          )}
          <div className="cp-form-footer">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save profile' : 'Add team member'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
