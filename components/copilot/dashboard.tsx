'use client';
import {
  CalendarDays,
  Clock3,
  Sparkles,
  ChartNoAxesCombined,
  Plus,
  Play,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Headphones,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  useApp,
  Waveform,
  dateKey,
  ConsultationTable,
  SearchBox,
} from './shared';
export default function Dashboard() {
  const { data, openDemo, openSchedule, view } = useApp();
  const [q, setQ] = useState('');
  const today = data.consultations.filter(
      (c) => dateKey(c.start) === dateKey(),
    ),
    done = today.filter((c) => c.status === 'Completed');
  const upcoming = today
    .filter((c) => !['Completed', 'Cancelled'].includes(c.status))
    .sort((a, b) => a.start.localeCompare(b.start));
  const used = data.metrics.accepted,
    helpful = data.metrics.feedback
      ? Math.round((100 * used) / data.metrics.feedback)
      : 0;
  const totalTime = done.reduce((n, c) => n + (c.duration || 0), 0);
  return (
    <>
      <div className="cp-page-title">
        <div>
          <div className="cp-overline">
            {new Date()
              .toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Kolkata',
              })
              .toUpperCase()}
          </div>
          <h1>A good day to make a difference.</h1>
          <p>
            Welcome back, {data.user.name.split(' ')[0]}. Let's help businesses
            move forward.
          </p>
        </div>
        {data.user.role !== 'Supervisor' && (
          <Button onClick={openSchedule}>
            <Plus size={16} /> New consultation
          </Button>
        )}
      </div>
      <section className="cp-hero">
        <div>
          <span className="cp-eyebrow">
            <span className="cp-pulse" /> YOUR EXPERTISE. AMPLIFIED.
          </span>
          <h2>
            Be present in the conversation.
            <br />
            We'll help with the answers.
          </h2>
          <p>
            Real-time insights, trusted knowledge, and the right next question.
            <br />
            Your AI copilot is ready when you are.
          </p>
          <div className="cp-row">
            <Button
              onClick={data.user.demo ? openDemo : () => view('consultations')}
            >
              <Play size={15} fill="currentColor" />
              {data.user.demo
                ? 'Start Demo Consultation'
                : 'Open today’s consultations'}
              <ArrowRight size={16} />
            </Button>
            <span>6 scenarios · English, हिंदी, मराठी</span>
          </div>
        </div>
        <Waveform />
      </section>
      <section className="cp-stats">
        {[
          {
            title: "Today's consultations",
            value: String(today.length).padStart(2, '0'),
            sub: `${done.length} completed · ${upcoming.length} ahead`,
            icon: CalendarDays,
          },
          {
            title: 'Consultation time',
            value: `${Math.floor(totalTime / 3600)}h ${Math.floor((totalTime % 3600) / 60)}m`,
            sub: 'Time spent with SMEs today',
            icon: Clock3,
          },
          {
            title: 'AI suggestions used',
            value: String(used).padStart(2, '0'),
            sub: 'Across your consultations',
            icon: Sparkles,
          },
          {
            title: 'Helpful answers',
            value: helpful + '%',
            sub: `From ${data.metrics.feedback} feedback responses`,
            icon: ChartNoAxesCombined,
          },
        ].map((s) => (
          <article key={s.title}>
            <div>
              {s.title}
              <s.icon size={18} />
            </div>
            <strong>{s.value}</strong>
            <small>{s.sub}</small>
          </article>
        ))}
      </section>
      <div className="cp-dashboard-grid">
        <section className="cp-panel">
          <div className="cp-section-title">
            <div>
              <h2>Your consultations</h2>
              <p>A clear view of the conversations ahead.</p>
            </div>
            <button
              className="cp-text-button"
              onClick={() => view('consultations')}
            >
              View schedule <ArrowUpRight size={15} />
            </button>
          </div>
          <ConsultationTable items={upcoming.slice(0, 4)} />
        </section>
        <aside className="cp-panel cp-ready">
          <span className="cp-icon-tile">
            <BookOpen size={22} />
          </span>
          <h2>
            Good advice starts with
            <br />
            trusted knowledge.
          </h2>
          <p>
            Find the right information in your team's approved resource library.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              view('knowledge');
            }}
          >
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="Search knowledge base…"
            />
          </form>
          <div className="cp-topic-list">
            {data.categories.slice(0, 3).map((t) => (
              <button key={t} onClick={() => view('knowledge')}>
                <span>{t}</span>
                <small>
                  {
                    data.knowledge.filter(
                      (d) => d.category === t && d.status === 'Approved',
                    ).length
                  }{' '}
                  resources
                </small>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </aside>
      </div>
      <div className="cp-bottom-note">
        <ShieldCheck size={14} /> Consultant-only assistance. Your client sees
        the conversation, never your copilot.
        <span>
          Made for meaningful conversations <Headphones size={14} />
        </span>
      </div>
    </>
  );
}
