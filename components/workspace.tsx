'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  ListChecks,
  ShieldCheck,
  ClipboardCheck,
  Lightbulb,
  Target,
  FolderOpen,
  FileBadge,
  BarChart3,
  Users,
  SlidersHorizontal,
  Settings,
  HelpCircle,
  Bell,
  Search,
  Menu,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  LogOut,
  CheckCircle2,
  Clock,
  TriangleAlert,
  FileText,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  fields,
  roles,
  categories,
  taskStatus,
  dateLabel,
  auditScore,
  Field,
} from '@/lib/model';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
type Row = Record<string, any>;
const navigation = [
  ['Dashboard', LayoutDashboard],
  ['My Company', Building2],
  ['Compliance Calendar', CalendarDays],
  ['Requirements', ShieldCheck],
  ['My Tasks', ListChecks],
  ['Approvals', CheckCircle2],
  ['Audits', ClipboardCheck],
  ['Kaizen', Lightbulb],
  ['Corrective Actions', Target],
  ['Documents', FolderOpen],
  ['Licences', FileBadge],
  ['Reports', BarChart3],
  ['Users & Roles', Users],
  ['Templates', SlidersHorizontal],
  ['Settings', Settings],
  ['Help & Support', HelpCircle],
] as const;
const moduleKind: Record<string, string> = {
  Requirements: 'requirement',
  'My Tasks': 'task',
  Audits: 'audit',
  Kaizen: 'kaizen',
  'Corrective Actions': 'action',
  Licences: 'licence',
  Templates: 'compliance-template',
};
const today = () => new Date().toISOString().slice(0, 10);
function Badge({ value }: { value: string }) {
  return (
    <span
      className={
        'badge ' +
        (['Completed', 'Verified', 'Closed', 'Compliant', 'Active'].includes(
          value,
        )
          ? 'green'
          : ['Overdue', 'Returned', 'Non-Compliant', 'Critical'].includes(value)
            ? 'red'
            : [
                  'Awaiting Approval',
                  'Submitted',
                  'Under Review',
                  'In Progress',
                  'Pending Verification',
                ].includes(value)
              ? 'blue'
              : [
                    'Due Soon',
                    'Needs Review',
                    'Partially Compliant',
                    'Renewal Due',
                  ].includes(value)
                ? 'amber'
                : 'grey')
      }
    >
      <i />
      {value}
    </span>
  );
}
function FieldInput({
  field,
  value,
  onChange,
  users,
  records,
  disabled = false,
}: {
  field: Field;
  value: any;
  onChange: (v: any) => void;
  users: Row[];
  records: Row[];
  disabled?: boolean;
}) {
  const props = {
    id: field.key,
    value: value ?? '',
    required: field.required,
    disabled,
    onChange: (e: any) =>
      onChange(
        field.type === 'number'
          ? e.target.value === ''
            ? ''
            : Number(e.target.value)
          : e.target.value,
      ),
  };
  let options: Row[] = [];
  if (field.type === 'user')
    options = users
      .filter((u) => u.status === 'Active')
      .map((u) => ({ value: u.id, label: u.name + ' · ' + u.role }));
  else if (field.type === 'requirement')
    options = records
      .filter((r) => r.kind === 'requirement' && r.status === 'Verified')
      .map((r) => ({ value: r.id, label: r.title }));
  else if (field.type === 'template')
    options = records
      .filter((r) => r.kind === 'audit-template')
      .map((r) => ({ value: r.id, label: r.title }));
  else options = (field.options || []).map((s) => ({ value: s, label: s }));
  return (
    <label
      className={['textarea', 'lines'].includes(field.type || '') ? 'wide' : ''}
      htmlFor={field.key}
    >
      {field.label}
      {field.required && <em> *</em>}
      {['select', 'user', 'requirement', 'template'].includes(
        field.type || '',
      ) ? (
        <select {...props}>
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : ['textarea', 'lines'].includes(field.type || '') ? (
        <textarea
          {...props}
          rows={3}
          value={
            Array.isArray(value)
              ? value
                  .map((v) => (typeof v === 'string' ? v : v.text))
                  .join('\n')
              : value || ''
          }
          onChange={(e) =>
            onChange(
              field.type === 'lines'
                ? e.target.value.split('\n')
                : e.target.value,
            )
          }
        />
      ) : (
        <input
          {...props}
          type={field.type || 'text'}
          min={field.type === 'number' ? 0 : undefined}
        />
      )}
    </label>
  );
}
export default function Workspace() {
  const [data, setData] = useState<Row | null>(null),
    [loading, setLoading] = useState(true),
    [view, setView] = useState('Dashboard'),
    [search, setSearch] = useState(''),
    [globalSearch, setGlobalSearch] = useState(''),
    [status, setStatus] = useState('All statuses'),
    [dept, setDept] = useState('All departments'),
    [ownerFilter, setOwnerFilter] = useState('All people'),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [toast, setToast] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState<Row | null>(null),
    [draft, setDraft] = useState<Row>({}),
    [selected, setSelected] = useState<string | null>(null),
    [tab, setTab] = useState('Overview'),
    [comment, setComment] = useState(''),
    [notifications, setNotifications] = useState(false),
    [calendarDate, setCalendarDate] = useState(new Date()),
    [calendarMode, setCalendarMode] = useState('Month'),
    [reportType, setReportType] = useState('Monthly Compliance Report'),
    [templateType, setTemplateType] = useState('compliance-template');
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/workspace');
      if (res.status === 401) {
        setData(null);
        return;
      }
      const b = (await res.json()) as any;
      if (!res.ok) throw Error(b.error);
      setData(b);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view')) setView(params.get('view')!);
      if (params.get('record')) setSelected(params.get('record'));
      void load();
    });
  }, [load]);
  useEffect(() => {
    document.title =
      (data?.records.find((r: Row) => r.id === selected)?.title || view) +
      ' | Compliance Mitra';
  }, [data, selected, view]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  async function request(payload: Row, path = '/api/workspace') {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const b = (await res.json()) as any;
    if (!res.ok) throw Error(b.error);
    return b;
  }
  async function act(payload: Row, message = 'Changes saved') {
    setBusy(true);
    setError('');
    try {
      const result = await request(payload);
      await load();
      setToast(message);
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  function go(next: string) {
    setView(next);
    setSelected(null);
    setSearch('');
    setGlobalSearch('');
    setStatus('All statuses');
    setDept('All departments');
    setOwnerFilter('All people');
    setMobile(false);
    window.history.replaceState(
      {},
      '',
      `/workspace?view=${encodeURIComponent(next)}`,
    );
  }
  function open(r: Row) {
    setSelected(r.id);
    setTab('Overview');
    setDraft({ ...r });
    setComment('');
    window.history.replaceState(
      {},
      '',
      `/workspace?view=${encodeURIComponent(view)}&record=${r.id}`,
    );
  }
  function create(kind: string, extra: Row = {}) {
    setModal({ kind });
    setDraft({
      status: 'Active',
      priority: 'Medium',
      frequency: 'Monthly',
      due: today(),
      owner_id: data?.user.id,
      reviewer_id:
        data?.users.find((u: Row) => u.role === 'Reviewer')?.id ||
        data?.user.id,
      ...extra,
    });
    setError('');
  }
  async function upload(file: File, recordId?: string, category = 'Other') {
    setBusy(true);
    try {
      const f = new FormData();
      f.set('file', file);
      f.set('category', category);
      if (recordId) f.set('record_id', recordId);
      const res = await fetch('/api/files', { method: 'POST', body: f });
      const b = (await res.json()) as any;
      if (!res.ok) throw Error(b.error);
      await load();
      setToast('Document uploaded');
      return b.id;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function exportReport(
    format: string,
    rows: Row[],
    title: string,
    blank = false,
  ) {
    setBusy(true);
    setError('');
    try {
      const { pdfReport, excelReport, download } =
        await import('@/lib/reports');
      const resolved = rows.map((r) => ({
        ...r,
        owner_id:
          data?.users.find((u: Row) => u.id === r.owner_id)?.name || r.owner_id,
        reviewer_id:
          data?.users.find((u: Row) => u.id === r.reviewer_id)?.name ||
          r.reviewer_id,
      }));
      if (format === 'PDF')
        download(
          (await pdfReport(data?.company, title, resolved, blank)) as BlobPart,
          'application/pdf',
          `${title}.pdf`,
        );
      else
        download(
          (await excelReport(data?.company, title, resolved)) as BlobPart,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          `${title}.xlsx`,
        );
      setToast(`${format} downloaded`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <main className="auth">
        <h1>Opening your workspace…</h1>
        <p>Loading your company’s compliance position.</p>
      </main>
    );
  if (!data)
    return (
      <main className="auth">
        <img src="/assets/mccia-logo.png" alt="MCCIA" width="135" />
        <h1>Your compliance workspace</h1>
        <p>
          Sign in to your company account or explore a separate demo with sample
          records and all seven roles.
        </p>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <Button render={<a href="/login" aria-label="Sign in" />}>
            Sign in
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await request({ action: 'demo' }, '/api/auth');
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Explore demo
          </Button>
        </div>
        <a href="/register">Create a company account →</a>
      </main>
    );
  const { user, company, users, records, files } = data as {
    user: Row;
    company: Row;
    users: Row[];
    records: Row[];
    files: Row[];
  };
  const isManager = [
      'Owner',
      'Compliance Manager',
      'MCCIA Administrator',
    ].includes(user.role),
    isExpert = ['Expert', 'Auditor', 'MCCIA Administrator'].includes(user.role),
    isReviewer = [
      'Owner',
      'Compliance Manager',
      'Reviewer',
      'Expert',
      'Auditor',
      'MCCIA Administrator',
    ].includes(user.role);
  const tasks = records.filter((r) => r.kind === 'task'),
    audits = records.filter((r) => r.kind === 'audit'),
    kaizens = records.filter((r) => r.kind === 'kaizen'),
    actions = records.filter((r) => r.kind === 'action');
  const person = (pid: string) =>
    users.find((u) => u.id === pid)?.name || 'Unassigned';
  const complete = tasks.filter((t) => t.status === 'Completed').length,
    overdue = tasks.filter((t) => taskStatus(t) === 'Overdue').length,
    awaiting = tasks.filter((t) => t.status === 'Awaiting Approval').length,
    dueSoon = tasks.filter((t) => taskStatus(t) === 'Due Soon').length;
  const health = tasks.length
    ? Math.max(
        0,
        Math.round(
          ((complete +
            awaiting * 0.7 +
            (tasks.length - complete - awaiting - overdue) * 0.45) /
            tasks.length) *
            100 -
            Math.min(
              actions.filter((a) => a.status !== 'Closed').length * 2,
              20,
            ),
        ),
      )
    : 0;
  const filtered = (rows: Row[]) =>
    rows.filter(
      (r) =>
        (!search ||
          JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) &&
        (status === 'All statuses' ||
          (['task', 'licence', 'action'].includes(r.kind)
            ? taskStatus(r)
            : r.status) === status) &&
        (dept === 'All departments' || r.department === dept) &&
        (ownerFilter === 'All people' || r.owner_id === ownerFilter) &&
        (!from || (r.due || r.expiry || r.date || '') >= from) &&
        (!to || (r.due || r.expiry || r.date || '').slice(0, 10) <= to),
    );
  const selectedRow = records.find((r) => r.id === selected);
  const allowedNav = navigation.filter(([n]) =>
    user.role === 'Employee'
      ? [
          'Dashboard',
          'My Tasks',
          'Compliance Calendar',
          'Documents',
          'Help & Support',
        ].includes(n)
      : !['Owner', 'MCCIA Administrator'].includes(user.role)
        ? !['Users & Roles'].includes(n) &&
          (!(n === 'Settings' || n === 'Templates') || isManager)
        : true,
  );
  const fieldList = (kind: string, d: Row, onChange: (d: Row) => void) => (
    <div className="form-grid">
      {(fields[kind] || []).map((f) => (
        <FieldInput
          key={f.key}
          field={f}
          value={d[f.key]}
          users={users}
          records={records}
          onChange={(v) => onChange({ ...d, [f.key]: v })}
        />
      ))}
    </div>
  );
  const toolbar = (rows: Row[]) => (
    <div className="toolbar">
      <div className="search">
        <Search size={16} />
        <input
          aria-label="Search records"
          placeholder="Search records…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <select
        aria-label="Filter status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option>All statuses</option>
        {Array.from(
          new Set(
            rows.map((r) =>
              ['task', 'licence', 'action'].includes(r.kind)
                ? taskStatus(r)
                : r.status,
            ),
          ),
        ).map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <select
        aria-label="Filter department"
        value={dept}
        onChange={(e) => setDept(e.target.value)}
      >
        <option>All departments</option>
        {Array.from(new Set(rows.map((r) => r.department).filter(Boolean))).map(
          (d) => (
            <option key={d}>{d}</option>
          ),
        )}
      </select>
      <select
        aria-label="Filter responsible person"
        value={ownerFilter}
        onChange={(e) => setOwnerFilter(e.target.value)}
      >
        <option>All people</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <label className="date-filter">
        From
        <input
          aria-label="From date"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label className="date-filter">
        To
        <input
          aria-label="To date"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
    </div>
  );
  const table = (rows: Row[], type = '') => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>
              {type === 'kaizen'
                ? 'Improvement'
                : type === 'audit'
                  ? 'Audit'
                  : 'Requirement / activity'}
            </th>
            <th>Department / category</th>
            <th>Responsible person</th>
            <th>Due date</th>
            <th>Status</th>
            <th>
              {type === 'audit'
                ? 'Score'
                : type === 'kaizen'
                  ? 'Savings'
                  : 'Priority'}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <button className="record-link" onClick={() => open(r)}>
                  {r.title}
                  <ArrowUpRight size={13} />
                </button>
                <small>
                  {r.authority || r.source || r.period || r.frequency || r.type}
                </small>
              </td>
              <td>{r.department || r.category || '—'}</td>
              <td>
                <div className="person">
                  <span>
                    {person(r.owner_id)
                      .split(' ')
                      .map((s: string) => s[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  {person(r.owner_id)}
                </div>
              </td>
              <td>{dateLabel(r.due || r.expiry)}</td>
              <td>
                <Badge
                  value={
                    ['task', 'licence', 'action'].includes(r.kind)
                      ? taskStatus(r)
                      : r.status
                  }
                />
              </td>
              <td>
                {type === 'audit'
                  ? auditScore(r) + '%'
                  : type === 'kaizen'
                    ? '₹' +
                      Number(r.actual_savings || 0).toLocaleString('en-IN')
                    : r.priority || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="empty">
          <CheckCircle2 />
          <h3>No matching records</h3>
          <p>Try adjusting your filters or add your first record.</p>
        </div>
      )}
    </div>
  );
  const sectionTitle = (
    title: string,
    sub: string,
    button?: React.ReactNode,
  ) => (
    <div className="page-heading">
      <div>
        <div className="eyebrow">YOUR COMPLIANCE WORKSPACE</div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {button}
    </div>
  );
  const exportButtons = (rows: Row[], title: string) => (
    <div className="actions">
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => exportReport('PDF', rows, title)}
      >
        <Download /> PDF
      </Button>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => exportReport('Excel', rows, title)}
      >
        <Download /> Excel
      </Button>
    </div>
  );
  function dashboard() {
    const categoryData = categories
      .map((category) => ({
        category,
        completed: tasks.filter(
          (t) => t.category === category && t.status === 'Completed',
        ).length,
        pending: tasks.filter(
          (t) => t.category === category && t.status !== 'Completed',
        ).length,
      }))
      .filter((x) => x.completed + x.pending);
    return (
      <>
        {sectionTitle(
          `Welcome back, ${user.name.split(' ')[0]}.`,
          'Here is your company’s compliance position.',
          <Button onClick={() => go('Compliance Calendar')} variant="outline">
            <CalendarDays />
            View calendar
          </Button>,
        )}
        <div className="company-strip">
          <Building2 />
          <div>
            <b>{company.name}</b>
            <small>
              {company.industry || 'Complete your company profile'} ·{' '}
              {company.state || 'Location not added'}
            </small>
          </div>
          <span className="spacer" />
          <span className="demo-label">
            {company.demo ? 'DEMO WORKSPACE' : 'COMPANY WORKSPACE'}
          </span>
        </div>
        <div className="kpis">
          {[
            ['Total compliances', tasks.length, ListChecks, 'blue'],
            ['Completed', complete, CheckCircle2, 'green'],
            ['Due soon', dueSoon, Clock, 'amber'],
            ['Overdue', overdue, TriangleAlert, 'red'],
            ['Awaiting approval', awaiting, ShieldCheck, 'blue'],
          ].map(([label, count, Icon, color]: any) => (
            <button
              key={label}
              className="kpi"
              onClick={() => {
                go(label === 'Awaiting approval' ? 'Approvals' : 'My Tasks');
                if (label === 'Overdue') setStatus('Overdue');
                if (label === 'Completed') setStatus('Completed');
                if (label === 'Due soon') setStatus('Due Soon');
              }}
            >
              <span>
                {label}
                <Icon className={color} />
              </span>
              <strong>{count}</strong>
              <small>
                {label === 'Overdue'
                  ? 'Needs your attention'
                  : label === 'Completed'
                    ? 'Approved and evidenced'
                    : 'Across your workspace'}
              </small>
            </button>
          ))}
        </div>
        <div className="dashboard-grid">
          <section className="panel">
            <div className="panel-heading">
              <h2>Upcoming deadlines</h2>
              <button className="text-button" onClick={() => go('My Tasks')}>
                View all <ArrowRight size={14} />
              </button>
            </div>
            {table(
              tasks
                .filter((t) => t.status !== 'Completed')
                .sort((a, b) => (a.due || '').localeCompare(b.due || ''))
                .slice(0, 5),
            )}
          </section>
          <section className="panel health">
            <h2>Compliance health</h2>
            <small>Internal Compliance Health Score</small>
            <div
              className="health-ring"
              style={{
                background: `conic-gradient(#24816b ${health * 3.6}deg,#e9eef3 0)`,
              }}
            >
              <div>
                <strong>
                  {health}
                  <sup>/100</sup>
                </strong>
                <span>
                  {health >= 80
                    ? 'On track'
                    : health >= 50
                      ? 'Needs attention'
                      : 'Action needed'}
                </span>
              </div>
            </div>
            <p>
              Based on completed work, deadlines, approvals and open audit
              findings.
            </p>
            <small>Internal indicator · not a legal certification</small>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>Compliance by category</h2>
              <span className="legend">
                ● Completed <span>● Pending</span>
              </span>
            </div>
            <div className="chart">
              <ResponsiveContainer width="100%" height={225}>
                <BarChart data={categoryData}>
                  <CartesianGrid vertical={false} stroke="#edf0f4" />
                  <XAxis dataKey="category" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Bar
                    dataKey="completed"
                    stackId="a"
                    fill="#246f95"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="pending"
                    stackId="a"
                    fill="#d9e6f0"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="panel">
            <h2>Recent activity</h2>
            <div className="timeline">
              {records
                .filter((r) => r.kind === 'activity')
                .slice(0, 5)
                .map((a) => (
                  <div key={a.id}>
                    <i />
                    <div>
                      <b>{a.title}</b>
                      <small>
                        {a.actor} · {dateLabel(a.date)}
                      </small>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>
        <div className="guidance-banner">
          <ShieldCheck />
          <div>
            <h3>Need expert guidance?</h3>
            <p>
              Get help understanding a requirement through MCCIA’s advisory
              ecosystem.
            </p>
          </div>
          <Button variant="outline" onClick={() => go('Help & Support')}>
            Request guidance <ArrowRight />
          </Button>
        </div>
      </>
    );
  }
  function calendar() {
    const y = calendarDate.getFullYear(),
      m = calendarDate.getMonth();
    const at = (day: number) => new Date(y, m, day, 12);
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const filteredTasks = filtered(tasks);
    const start = new Date(
      y,
      m,
      calendarDate.getDate() - calendarDate.getDay(),
      12,
    );
    const days =
      calendarMode === 'Week'
        ? Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return d;
          })
        : Array.from({ length: 42 }, (_, i) =>
            at(i - new Date(y, m, 1).getDay() + 1),
          );
    return (
      <>
        {sectionTitle(
          'Compliance calendar',
          'Plan the work. See every deadline and responsibility.',
          exportButtons(filteredTasks, 'Compliance Calendar'),
        )}
        {toolbar(tasks)}
        <section className="panel">
          <div className="panel-heading">
            <div className="actions">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous period"
                onClick={() =>
                  setCalendarDate(
                    new Date(
                      y - (calendarMode === 'Year' ? 1 : 0),
                      m -
                        (calendarMode === 'Month' || calendarMode === 'List'
                          ? 1
                          : 0),
                      calendarDate.getDate() -
                        (calendarMode === 'Week' ? 7 : 0),
                      12,
                    ),
                  )
                }
              >
                <ChevronLeft />
              </Button>
              <h2>
                {calendarDate.toLocaleDateString('en-IN', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h2>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next period"
                onClick={() =>
                  setCalendarDate(
                    new Date(
                      y + (calendarMode === 'Year' ? 1 : 0),
                      m +
                        (calendarMode === 'Month' || calendarMode === 'List'
                          ? 1
                          : 0),
                      calendarDate.getDate() +
                        (calendarMode === 'Week' ? 7 : 0),
                      12,
                    ),
                  )
                }
              >
                <ChevronRight />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCalendarDate(new Date())}
              >
                Today
              </Button>
            </div>
            <div className="tabs">
              {['Month', 'Week', 'List', 'Year'].map((v) => (
                <button
                  key={v}
                  className={calendarMode === v ? 'active' : ''}
                  onClick={() => setCalendarMode(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          {calendarMode === 'List' ? (
            table(filteredTasks)
          ) : calendarMode === 'Year' ? (
            <div className="year-grid">
              {Array.from({ length: 12 }, (_, month) => (
                <button
                  key={month}
                  onClick={() => {
                    setCalendarDate(new Date(y, month, 1));
                    setCalendarMode('Month');
                  }}
                >
                  <h3>
                    {new Date(y, month, 1).toLocaleDateString('en-IN', {
                      month: 'long',
                    })}
                  </h3>
                  <strong>
                    {
                      filteredTasks.filter((t) =>
                        t.due?.startsWith(
                          `${y}-${String(month + 1).padStart(2, '0')}`,
                        ),
                      ).length
                    }
                  </strong>
                  <small>compliance tasks</small>
                </button>
              ))}
            </div>
          ) : (
            <div
              className={'calendar ' + (calendarMode === 'Week' ? 'week' : '')}
            >
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div className="weekday" key={d}>
                  {d}
                </div>
              ))}
              {days.map((d) => (
                <div
                  key={iso(d)}
                  className={'day ' + (d.getMonth() !== m ? 'muted' : '')}
                >
                  <span className={iso(d) === today() ? 'today' : ''}>
                    {d.getDate()}
                  </span>
                  {filteredTasks
                    .filter((t) => t.due === iso(d))
                    .map((t) => (
                      <button
                        key={t.id}
                        className={
                          'event ' +
                          (taskStatus(t) === 'Overdue'
                            ? 'red'
                            : t.status === 'Completed'
                              ? 'green'
                              : 'blue')
                        }
                        onClick={() => open(t)}
                      >
                        <b>{t.title}</b>
                        <small>{person(t.owner_id)}</small>
                        <span>
                          {taskStatus(t)} · {t.priority}
                        </span>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          )}
        </section>
        <p className="note">
          Demo dates are illustrative. Confirm each due-date rule with a
          qualified expert.
        </p>
      </>
    );
  }
  function documentList(list: Row[]) {
    return (
      <div className="document-list">
        {list.map((f) => (
          <article key={f.id}>
            <FileText />
            <div className="spacer">
              <b>{f.name}</b>
              <small>
                {f.category} · v{f.version} · {(f.size / 1024).toFixed(1)} KB ·{' '}
                {dateLabel(f.created)}
              </small>
            </div>
            <Button
              variant="ghost"
              render={
                <a
                  href={`/api/files?id=${f.id}&preview=1`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Preview document"
                />
              }
            >
              Preview
            </Button>
            <Button
              variant="outline"
              render={
                <a
                  href={`/api/files?id=${f.id}`}
                  aria-label="Download document"
                />
              }
            >
              Download
            </Button>
            <Button
              variant="ghost"
              aria-label={`Delete ${f.name}`}
              onClick={() => {
                setModal({ kind: 'delete-file', file: f });
                setError('');
              }}
            >
              <X />
            </Button>
          </article>
        ))}
        {!list.length && (
          <div className="empty">
            <FolderOpen />
            <h3>No compliance documents uploaded</h3>
            <p>Upload a file to keep the supporting evidence with your work.</p>
          </div>
        )}
      </div>
    );
  }
  function uploadControl(
    recordId?: string,
    category = 'Other',
    after?: (id: string) => void,
  ) {
    return (
      <label className="upload-control">
        <Upload size={16} />
        {busy ? 'Uploading…' : 'Upload document'}
        <input
          aria-label="Upload document"
          type="file"
          disabled={busy}
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx,.csv,.txt"
          onChange={async (e) => {
            if (e.target.files?.[0]) {
              const fid = await upload(e.target.files[0], recordId, category);
              if (fid && after) after(fid);
            }
            e.target.value = '';
          }}
        />
      </label>
    );
  }
  function details(r: Row) {
    const linked = records.filter((x) => x.parent_id === r.id),
      documents = files.filter((f) => f.record_id === r.id),
      editable = !['Completed', 'Closed', 'Verified', 'Awaiting Approval', 'Submitted', 'Under Review', 'Implemented'].includes(r.status);
    const tabs =
      r.kind === 'task'
        ? [
            'Overview',
            'Checklist',
            'Documents',
            'Comments',
            'Approval',
            'Activity',
          ]
        : r.kind === 'audit'
          ? [
              'Overview',
              'Checklist',
              'Findings',
              'Corrective Actions',
              'Documents',
              'Activity',
            ]
          : r.kind === 'kaizen'
            ? [
                'Overview',
                'Before / After',
                'Benefits',
                'Actions',
                'Verification',
                'Activity',
              ]
            : ['Overview', 'Documents', 'Comments', 'Verification', 'Activity'];
    const transitions: Record<string, Record<string, string[]>> = {
      task: {
        'Not Started': ['In Progress', 'Awaiting Approval'],
        'In Progress': ['Awaiting Approval'],
        Returned: ['In Progress', 'Awaiting Approval'],
        'Awaiting Approval': ['Completed', 'Returned'],
      },
      audit: {
        Draft: ['Scheduled', 'In Progress'],
        Scheduled: ['In Progress'],
        'In Progress': ['Submitted'],
        Submitted: ['Under Review', 'In Progress'],
        'Under Review': ['Closed', 'In Progress'],
      },
      kaizen: {
        Proposed: ['In Progress'],
        'In Progress': ['Implemented'],
        Implemented: ['Verified'],
        Verified: ['Closed'],
      },
      action: {
        Open: ['Assigned', 'In Progress'],
        Assigned: ['In Progress'],
        'In Progress': ['Pending Verification'],
        'Pending Verification': ['Closed', 'In Progress'],
      },
    };
    const save = async () => {
      const out = await act({
        action: 'save',
        id: r.id,
        version: r.version,
        data: draft,
      });
      if (out) setToast('Progress saved');
    };
    return (
      <>
        <button
          className="back"
          onClick={() => {
            setSelected(null);
            window.history.replaceState(
              {},
              '',
              `/workspace?view=${encodeURIComponent(view)}`,
            );
          }}
        >
          <ChevronLeft size={15} /> Back to {view}
        </button>
        {sectionTitle(
          r.title,
          `${r.kind.replaceAll('-', ' ')} · ${r.department || r.category || company.name}`,
          exportButtons(
            [r],
            r.kind === 'kaizen'
              ? 'Kaizen Improvement Audit'
              : r.kind === 'audit'
                ? 'Compliance Audit'
                : r.title,
          ),
        )}
        <div className="record-summary">
          <Badge
            value={
              ['task', 'licence', 'action'].includes(r.kind)
                ? taskStatus(r)
                : r.status
            }
          />
          <span>
            Owner <b>{person(r.owner_id)}</b>
          </span>
          <span>
            Reviewer <b>{person(r.reviewer_id)}</b>
          </span>
          <span>
            Due <b>{dateLabel(r.due)}</b>
          </span>
          {r.kind === 'audit' && (
            <span>
              Audit score <b>{auditScore(r)}%</b>
            </span>
          )}
        </div>
        <div className="tabs detail-tabs">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setDraft({ ...r });
              }}
              className={tab === t ? 'active' : ''}
            >
              {t}
            </button>
          ))}
        </div>
        <section className="panel detail-panel">
          {tab === 'Overview' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              {fieldList(r.kind, draft, setDraft)}
              {r.kind === 'task' && (
                <div className="form-grid submission">
                  {[
                    { key: 'filing_date', label: 'Filing date', type: 'date' },
                    {
                      key: 'payment_amount',
                      label: 'Payment amount (INR)',
                      type: 'number',
                    },
                    { key: 'acknowledgement', label: 'Acknowledgement number' },
                    {
                      key: 'notes',
                      label: 'Submission notes',
                      type: 'textarea',
                    },
                  ].map((f) => (
                    <FieldInput
                      key={f.key}
                      field={f}
                      value={draft[f.key]}
                      users={users}
                      records={records}
                      onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                    />
                  ))}
                </div>
              )}
              {r.kind === 'requirement' && (
                <div className="callout">
                  <b>Potentially applicable · requires expert verification</b>
                  <p>
                    Only an expert-verified requirement creates active tasks.
                    Consult your CA/CS or authorized expert.
                  </p>
                  <p>
                    {r.remarks} {r.source && <span>Source: {r.source}</span>}
                  </p>
                  {isExpert && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setModal({ kind: 'verification', record: r });
                        setDraft({
                          decision: 'Applicable',
                          remarks: '',
                          source: '',
                        });
                      }}
                    >
                      Review applicability
                    </Button>
                  )}
                </div>
              )}
              {r.kind === 'audit-template' && (
                <div className="question-builder">
                  <h2>Template questions</h2>
                  {(draft.questions || []).map((q: Row, i: number) => (
                    <div className="form-grid" key={i}>
                      <label>
                        Section
                        <input
                          value={q.section || ''}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              questions: draft.questions.map(
                                (x: Row, j: number) =>
                                  j === i
                                    ? { ...x, section: e.target.value }
                                    : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        Question
                        <input
                          required
                          value={q.title}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              questions: draft.questions.map(
                                (x: Row, j: number) =>
                                  j === i ? { ...x, title: e.target.value } : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        Input type
                        <select
                          value={q.type}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              questions: draft.questions.map(
                                (x: Row, j: number) =>
                                  j === i ? { ...x, type: e.target.value } : x,
                              ),
                            })
                          }
                        >
                          {[
                            'Assessment',
                            'Text',
                            'Number',
                            'Date',
                            'Dropdown',
                            'Checkbox',
                            'Radio',
                            'File',
                          ].map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Options (comma separated)
                        <input
                          value={q.options || ''}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              questions: draft.questions.map(
                                (x: Row, j: number) =>
                                  j === i
                                    ? { ...x, options: e.target.value }
                                    : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        Scoring weight
                        <input
                          type="number"
                          min="1"
                          value={q.weight || 1}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              questions: draft.questions.map(
                                (x: Row, j: number) =>
                                  j === i
                                    ? { ...x, weight: Number(e.target.value) }
                                    : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={q.required !== false}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              questions: draft.questions.map(
                                (x: Row, j: number) =>
                                  j === i
                                    ? { ...x, required: e.target.checked }
                                    : x,
                              ),
                            })
                          }
                        />
                        Required
                      </label>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            questions: draft.questions.filter(
                              (_: Row, j: number) => i !== j,
                            ),
                          })
                        }
                      >
                        Remove question
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        questions: [
                          ...(draft.questions || []),
                          {
                            title: '',
                            type: 'Assessment',
                            section: 'General',
                            required: true,
                            weight: 1,
                          },
                        ],
                      })
                    }
                  >
                    <Plus /> Add question
                  </Button>
                </div>
              )}
              {r.kind === 'compliance-template' && isManager && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    create('requirement', {
                      ...r,
                      id: undefined,
                      kind: undefined,
                      status: undefined,
                      template_id: r.id,
                      due: today(),
                    })
                  }
                >
                  Use template for new requirement
                </Button>
              )}
              {editable && (
                <Button type="submit" disabled={busy}>
                  Save progress
                </Button>
              )}
            </form>
          )}
          {tab === 'Checklist' && r.kind === 'task' && (
            <>
              <h2>Required steps</h2>
              <p>
                {(draft.checklist || []).filter((q: Row) => q.done).length} /{' '}
                {(draft.checklist || []).length} completed
              </p>
              {(draft.checklist || []).map((q: Row, i: number) => (
                <label className="checklist-item" key={i}>
                  <input
                    type="checkbox"
                    disabled={!editable}
                    checked={q.done}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        checklist: draft.checklist.map((x: Row, j: number) =>
                          i === j ? { ...x, done: e.target.checked } : x,
                        ),
                      })
                    }
                  />
                  <span>{q.text}</span>
                </label>
              ))}
              {isManager && editable && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      checklist: [
                        ...(draft.checklist || []),
                        { text: 'New required step', done: false },
                      ],
                    })
                  }
                >
                  Add step
                </Button>
              )}
              {isManager &&
                (draft.checklist || []).map((q: Row, i: number) => (
                  <label key={i} className="step-edit">
                    Step {i + 1}
                    <input
                      value={q.text}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          checklist: draft.checklist.map((x: Row, j: number) =>
                            i === j ? { ...x, text: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              {editable && (
                <Button disabled={busy} onClick={save}>
                  Save checklist
                </Button>
              )}
            </>
          )}
          {tab === 'Checklist' && r.kind === 'audit' && (
            <>
              <h2>Audit assessment</h2>
              <p>
                Save your draft, then submit the completed audit for review.
              </p>
              {(draft.questions || []).map((q: Row, i: number) => {
                const change = (key: string, value: any) =>
                  setDraft({
                    ...draft,
                    questions: draft.questions.map((x: Row, j: number) =>
                      j === i ? { ...x, [key]: value } : x,
                    ),
                  });
                return (
                  <article className="audit-question" key={i}>
                    <small>
                      {q.section || 'COMPLIANCE REQUIREMENT'} ·{' '}
                      {String(i + 1).padStart(2, '0')}
                    </small>
                    <h3>
                      {q.title}
                      {q.required !== false ? ' *' : ''}
                    </h3>
                    {!q.type || q.type === 'Assessment' ? (
                      <div className="assessment">
                        {[
                          'Compliant',
                          'Partially Compliant',
                          'Non-Compliant',
                          'Not Applicable',
                        ].map((a) => (
                          <label key={a}>
                            <input
                              type="radio"
                              name={`assessment-${i}`}
                              checked={q.assessment === a}
                              onChange={() => change('assessment', a)}
                            />
                            {a}
                          </label>
                        ))}
                      </div>
                    ) : q.type === 'File' ? (
                      uploadControl(r.id, 'Audit', (fid) =>
                        change('answer', fid),
                      )
                    ) : q.type === 'Checkbox' ? (
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={q.answer === true}
                          onChange={(e) => change('answer', e.target.checked)}
                        />
                        Confirmed
                      </label>
                    ) : ['Dropdown', 'Radio'].includes(q.type) ? (
                      <select
                        aria-label={q.title}
                        value={q.answer || ''}
                        onChange={(e) => change('answer', e.target.value)}
                      >
                        <option value="">Select…</option>
                        {String(q.options || 'Yes,No')
                          .split(',')
                          .map((o) => (
                            <option key={o}>{o.trim()}</option>
                          ))}
                      </select>
                    ) : (
                      <input
                        aria-label={q.title}
                        type={q.type?.toLowerCase() || 'text'}
                        value={q.answer || ''}
                        onChange={(e) => change('answer', e.target.value)}
                      />
                    )}
                    <div className="form-grid">
                      {[
                        { key: 'law', label: 'Applicable law / rule' },
                        { key: 'document_number', label: 'Document number' },
                        {
                          key: 'validity',
                          label: 'Evidence validity',
                          type: 'date',
                        },
                        {
                          key: 'observation',
                          label: 'Observation',
                          type: 'textarea',
                        },
                        {
                          key: 'risk',
                          label: 'Risk',
                          type: 'select',
                          options: ['Low', 'Medium', 'High', 'Critical'],
                        },
                        { key: 'action', label: 'Corrective action' },
                        {
                          key: 'owner_id',
                          label: 'Action owner',
                          type: 'user',
                        },
                        { key: 'due', label: 'Target date', type: 'date' },
                      ].map((f) => (
                        <FieldInput
                          key={f.key}
                          field={f}
                          value={q[f.key]}
                          users={users}
                          records={records}
                          onChange={(v) => change(f.key, v)}
                        />
                      ))}
                    </div>
                    {uploadControl(r.id, 'Audit')}
                  </article>
                );
              })}
              <Button disabled={busy} onClick={save}>
                Save audit draft
              </Button>
            </>
          )}
          {tab === 'Documents' && (
            <>
              <div className="panel-heading">
                <h2>Supporting evidence</h2>
                {editable && uploadControl(r.id, r.category || 'Audit')}
              </div>
              {documentList(documents)}
            </>
          )}
          {tab === 'Before / After' && (
            <>
              <div className="before-after">
                {['before', 'after'].map((side) => (
                  <article key={side}>
                    <div className="eyebrow">{side.toUpperCase()}</div>
                    {r[side + '_image'] ? (
                      <img
                        src={`/api/files?id=${r[side + '_image']}&preview=1`}
                        alt={`${side} improvement condition`}
                      />
                    ) : (
                      <div className="image-empty">Upload a {side} image</div>
                    )}
                    <p>
                      {r[side + '_condition'] ||
                        'Describe this condition in the overview.'}
                    </p>
                    {editable && (
                      <label className="upload-control">
                        <Upload size={16} />
                        Upload {side} image
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          aria-label={`Upload ${side} image`}
                          onChange={async (e) => {
                            if (e.target.files?.[0]) {
                              const fid = await upload(
                                e.target.files[0],
                                r.id,
                                'Audit',
                              );
                              if (fid)
                                await act({
                                  action: 'save',
                                  id: r.id,
                                  data: { [side + '_image']: fid },
                                });
                            }
                          }}
                        />
                      </label>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === 'Benefits' && (
            <div className="kpis">
              {[
                ['Potential savings', r.expected_savings || 0],
                ['Actual savings', r.actual_savings || 0],
                ['Hours saved / month', r.time_saved || 0],
              ].map(([label, value]) => (
                <div key={label} className="kpi">
                  <span>{label}</span>
                  <strong>{Number(value).toLocaleString('en-IN')}</strong>
                </div>
              ))}
            </div>
          )}
          {['Findings', 'Corrective Actions', 'Actions'].includes(tab) && (
            <>
              <div className="panel-heading">
                <h2>Linked corrective actions</h2>
                {(isManager || isExpert) && (
                  <Button
                    onClick={() =>
                      create('action', {
                        parent_id: r.id,
                        source:
                          r.kind === 'audit'
                            ? 'Compliance Audit'
                            : 'Kaizen Audit',
                        owner_id: r.owner_id,
                        reviewer_id: r.reviewer_id,
                      })
                    }
                  >
                    <Plus />
                    Add action
                  </Button>
                )}
              </div>
              {table(linked.filter((x) => x.kind === 'action'))}
            </>
          )}
          {tab === 'Comments' && (
            <>
              <h2>Discussion</h2>
              {linked
                .filter((x) => x.kind === 'comment')
                .map((c) => (
                  <article className="comment" key={c.id}>
                    <b>{c.actor}</b>
                    <small>{dateLabel(c.date)}</small>
                    <p>{c.title}</p>
                  </article>
                ))}
              <label>
                Add a comment
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
              <Button
                disabled={busy || !comment.trim()}
                onClick={async () => {
                  if (
                    await act(
                      { action: 'comment', id: r.id, text: comment },
                      'Comment added',
                    )
                  )
                    setComment('');
                }}
              >
                Post comment
              </Button>
            </>
          )}
          {['Approval', 'Verification'].includes(tab) && (
            <>
              <h2>Review & verification</h2>
              {documentList(documents)}
              <p>
                {r.verification_remarks ||
                  'Review the work and supporting evidence before approving.'}
              </p>
              {r.verified_by && (
                <p>
                  Verified by <b>{r.verified_by}</b> on{' '}
                  {dateLabel(r.verification_date)}
                </p>
              )}
              {(r.history || []).map((h: Row, i: number) => (
                <div className="comment" key={i}>
                  <b>{h.text}</b>
                  <small>
                    {h.actor} · {dateLabel(h.date)}
                  </small>
                  <p>{h.comment}</p>
                </div>
              ))}
            </>
          )}
          {tab === 'Activity' && (
            <div className="timeline">
              {linked
                .filter((x) => x.kind === 'activity')
                .map((a) => (
                  <div key={a.id}>
                    <i />
                    <div>
                      <b>{a.title}</b>
                      <small>
                        {a.actor} · {dateLabel(a.date)}
                      </small>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
        {transitions[r.kind]?.[r.status] && (
          <section className="workflow-bar">
            <div>
              <b>Move this work forward</b>
              <small>Save edits before changing status.</small>
            </div>
            <label className="spacer">
              Review / correction remarks
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Required for corrections and verification"
              />
            </label>
            {transitions[r.kind][r.status]
              .filter((next) =>
                [
                  'Completed',
                  'Returned',
                  'Closed',
                  'Verified',
                  'Under Review',
                ].includes(next)
                  ? isReviewer
                  : isManager || isExpert || r.owner_id === user.id,
              )
              .map((next) => (
                <Button
                  key={next}
                  variant={next === 'Returned' ? 'outline' : 'default'}
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await act(
                        {
                          action: 'transition',
                          id: r.id,
                          version: r.version,
                          status: next,
                          comment,
                        },
                        `Status updated to ${next}`,
                      )
                    )
                      setComment('');
                  }}
                >
                  {(
                    {
                      Completed: 'Approve',
                      Returned: 'Return for correction',
                      'Awaiting Approval': 'Submit for review',
                      Submitted: 'Submit audit',
                      'In Progress': 'Start / resume',
                      Closed: 'Verify & close',
                      Verified: 'Verify improvement',
                      'Pending Verification': 'Submit evidence',
                    } as Record<string, string>
                  )[next] || next}
                </Button>
              ))}
          </section>
        )}
      </>
    );
  }
  function profile() {
    const required = [
      'name',
      'legal_name',
      'industry',
      'state',
      'address',
      'employees',
      'gst',
      'udyam',
      'logo',
    ];
    const missing = required.filter((k) => !company[k]);
    return (
      <>
        {sectionTitle(
          'My company',
          'Enter your profile once. Keep every compliance connected.',
          <Button
            onClick={() => {
              setModal({ kind: 'company' });
              setDraft({ ...company });
            }}
          >
            Edit company profile
          </Button>,
        )}
        <div className="dashboard-grid">
          <section className="panel">
            <div className="company-profile-heading">
              {company.logo ? (
                <img
                  src={`/api/files?id=${company.logo}&preview=1`}
                  alt="Company logo"
                />
              ) : (
                <Building2 size={42} />
              )}
              <div>
                <h2>{company.name}</h2>
                <p>{company.industry}</p>
              </div>
            </div>
            <div className="form-grid">
              {fields.company
                .filter((f) => company[f.key])
                .map((f) => (
                  <div key={f.key}>
                    <small>{f.label}</small>
                    <b>{company[f.key]}</b>
                  </div>
                ))}
            </div>
            <div className="callout">
              <h3>Company branding</h3>
              <p>
                Your uploaded logo will appear on PDF reports, Excel workbooks
                and audit forms.
              </p>
              <label className="upload-control">
                <Upload size={16} />
                Upload company logo
                <input
                  aria-label="Upload company logo"
                  type="file"
                  accept="image/png,image/jpeg"
                  disabled={busy || !isManager}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const fid = await upload(file, undefined, 'Company');
                      if (fid)
                        await act({
                          action: 'company',
                          data: { ...company, logo: fid },
                        });
                    }
                  }}
                />
              </label>
            </div>
          </section>
          <div>
            <section className="panel">
              <h2>Profile completion</h2>
              <strong className="big-number">
                {Math.round(
                  ((required.length - missing.length) / required.length) * 100,
                )}
                %
              </strong>
              <progress
                value={required.length - missing.length}
                max={required.length}
              />
              {required.map((k) => (
                <div className="completion" key={k}>
                  {company[k] ? (
                    <CheckCircle2 className="green" size={16} />
                  ) : (
                    <TriangleAlert className="amber" size={16} />
                  )}
                  <span>{k.replaceAll('_', ' ')}</span>
                  <small>{company[k] ? 'Complete' : 'Missing'}</small>
                </div>
              ))}
            </section>
            <section className="panel">
              <h3>Potential compliance requirements</h3>
              <p>
                Manufacturing: factory, environment and safety.
                Employee-related: labour, PF and ESIC. Registrations: GST, tax
                and corporate requirements.
              </p>
              <p>Suggestions require review by a qualified expert.</p>
              <Button variant="outline" onClick={() => go('Requirements')}>
                Review checklist <ArrowRight />
              </Button>
            </section>
          </div>
        </div>
      </>
    );
  }
  function reports() {
    const reportNames = [
      'Compliance Status Report',
      'Monthly Compliance Report',
      'Overdue Compliance Report',
      'Audit Report',
      'Kaizen Report',
      'Corrective Action Report',
      'Licence Expiry Report',
      'Department Performance Report',
      'Document Missing Report',
    ];
    let rows =
      reportType === 'Audit Report'
        ? audits
        : reportType === 'Kaizen Report'
          ? kaizens
          : reportType === 'Corrective Action Report'
            ? actions
            : reportType === 'Licence Expiry Report'
              ? records.filter((r) => r.kind === 'licence')
              : reportType === 'Overdue Compliance Report'
                ? tasks.filter((t) => taskStatus(t) === 'Overdue')
                : reportType === 'Document Missing Report'
                  ? tasks.filter(
                      (t) => !files.some((f) => f.record_id === t.id),
                    )
                  : reportType === 'Department Performance Report'
                    ? Array.from(
                        new Set(tasks.map((t) => t.department || 'Unassigned')),
                      ).map((d) => ({
                        title: d,
                        total: tasks.filter((t) => t.department === d).length,
                        completed: tasks.filter(
                          (t) => t.department === d && t.status === 'Completed',
                        ).length,
                        overdue: tasks.filter(
                          (t) =>
                            t.department === d && taskStatus(t) === 'Overdue',
                        ).length,
                      }))
                    : tasks;
    rows = filtered(rows);
    return (
      <>
        {sectionTitle(
          'Reports & branded forms',
          'Turn your company’s records into clear, shareable reports.',
        )}
        <div className="report-layout">
          <aside className="panel">
            {reportNames.map((name) => (
              <button
                className={
                  reportType === name ? 'report-choice active' : 'report-choice'
                }
                onClick={() => setReportType(name)}
                key={name}
              >
                <FileText size={17} />
                {name}
              </button>
            ))}
          </aside>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>{reportType}</h2>
                <small>{company.name}</small>
              </div>
              {exportButtons(rows, reportType)}
            </div>
            {toolbar(rows)}
            <div className="report-preview">
              <div className="eyebrow">MANAGEMENT OVERVIEW</div>
              <h2>{company.name}</h2>
              <p>
                {reportType} · Prepared {dateLabel(today())}
              </p>
              <div className="mini-kpis">
                <div>
                  <strong>{rows.length}</strong>
                  <small>Records in report</small>
                </div>
                <div>
                  <strong>
                    {
                      rows.filter((r) =>
                        ['Completed', 'Closed', 'Verified'].includes(r.status),
                      ).length
                    }
                  </strong>
                  <small>Completed / verified</small>
                </div>
              </div>
              {table(rows.slice(0, 8))}
            </div>
            {!company.logo && (
              <p className="note">
                Upload company logo in My Company to personalize these reports.
              </p>
            )}
          </section>
        </div>
        <section className="panel">
          <h2>Company-branded forms</h2>
          <div className="form-downloads">
            {[
              'Compliance Audit Form',
              'Kaizen Improvement Audit Form',
              'Corrective Action Form',
              'Compliance Checklist',
              'Monthly Compliance Report',
              'Audit Summary',
              'Licence Register',
            ].map((title) => (
              <Button
                key={title}
                variant="outline"
                disabled={busy}
                onClick={() => {
                  const kind = title.includes('Kaizen')
                    ? 'kaizen'
                    : title.includes('Corrective')
                      ? 'action'
                      : title.includes('Licence')
                        ? 'licence'
                        : title.includes('Audit')
                          ? 'audit'
                          : 'task';
                  const row = Object.fromEntries(
                    (fields[kind] || []).map((f) => [
                      f.key,
                      '________________________________',
                    ]),
                  );
                  void exportReport('PDF', [{ ...row, title }], title, true);
                }}
              >
                <Download />
                {title}
              </Button>
            ))}
          </div>
        </section>
      </>
    );
  }
  function mainView() {
    if (selectedRow) return details(selectedRow);
    if (view === 'Dashboard') return dashboard();
    if (view === 'Compliance Calendar') return calendar();
    if (view === 'My Company') return profile();
    if (view === 'Reports') return reports();
    if (view === 'Documents')
      return (
        <>
          {sectionTitle(
            'Document repository',
            'Search, preview and download your company’s private evidence.',
            <Button
              onClick={() => {
                setModal({ kind: 'upload' });
                setDraft({ category: 'Other' });
              }}
            >
              <Upload />
              Upload document
            </Button>,
          )}
          <div className="toolbar">
            <div className="search">
              <Search size={16} />
              <input
                aria-label="Search documents"
                placeholder="Search documents…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="Document category"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>All statuses</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <section className="panel">
            {documentList(
              files.filter(
                (f) =>
                  (!search ||
                    f.name.toLowerCase().includes(search.toLowerCase())) &&
                  (status === 'All statuses' || f.category === status),
              ),
            )}
          </section>
        </>
      );
    if (view === 'Approvals') {
      const pending = records.filter(
        (r) =>
          [
            'Awaiting Approval',
            'Submitted',
            'Under Review',
            'Pending Verification',
            'Implemented',
          ].includes(r.status) &&
          (isManager || isExpert || r.reviewer_id === user.id),
      );
      return (
        <>
          {sectionTitle(
            'Pending approvals',
            'Review evidence, approve completed work or request corrections.',
          )}
          <div className="approval-grid">
            {filtered(pending).map((r) => (
              <section className="panel" key={r.id}>
                <Badge value={r.status} />
                <h2>{r.title}</h2>
                <p>Submitted by {person(r.owner_id)}</p>
                <small>
                  {files.filter((f) => f.record_id === r.id).length} documents ·
                  Due {dateLabel(r.due)}
                </small>
                <Button
                  onClick={() => {
                    open(r);
                    setTab(r.kind === 'task' ? 'Approval' : 'Verification');
                  }}
                >
                  Review submission <ArrowRight />
                </Button>
              </section>
            ))}
          </div>
          {!pending.length && (
            <div className="empty">
              <CheckCircle2 />
              <h2>You’re all caught up</h2>
              <p>No submissions are waiting for your review.</p>
            </div>
          )}
        </>
      );
    }
    if (view === 'Users & Roles')
      return (
        <>
          {sectionTitle(
            'Users & roles',
            'Manage the people responsible for compliance.',
            <Button onClick={() => create('user', { role: 'Employee' })}>
              <Plus />
              Add team member
            </Button>,
          )}
          <section className="panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>
                        {u.email.endsWith('@demo.invalid')
                          ? 'Demo account'
                          : u.email}
                      </td>
                      <td>{u.department || '—'}</td>
                      <td>{u.role}</td>
                      <td>
                        <Badge value={u.status} />
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setModal({ kind: 'user' });
                            setDraft({ ...u });
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {user.role === 'MCCIA Administrator' && (
            <section className="panel">
              <h2>Organization administration</h2>
              <p>Authorized organization workspace</p>
              <div className="mini-kpis">
                {[
                  ['Organizations', 1],
                  ['Users', users.length],
                  ['Tasks', tasks.length],
                  [
                    'Open audits',
                    audits.filter((a) => a.status !== 'Closed').length,
                  ],
                  ['Corrective actions', actions.length],
                  ['Kaizen initiatives', kaizens.length],
                ].map(([label, n]) => (
                  <div key={label}>
                    <strong>{n}</strong>
                    <small>{label}</small>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={() => go('Dashboard')}>
                Open {company.name}
              </Button>
            </section>
          )}
        </>
      );
    if (view === 'Settings') {
      const settings = records.find((r) => r.kind === 'settings');
      return (
        <>
          {sectionTitle(
            'Workspace settings',
            'Configure departments, reminders and escalation rules.',
          )}
          <section className="panel">
            <div className="form-grid">
              {fields.settings.map((f) => (
                <div key={f.key}>
                  <small>{f.label}</small>
                  <b>{settings?.[f.key] || 'Not configured'}</b>
                </div>
              ))}
            </div>
            <div className="callout">
              <b>In-app reminders</b>
              <p>
                Reminders and escalations are evaluated when the workspace is
                opened. Email and background scheduled delivery are not
                configured.
              </p>
            </div>
            {settings && isManager && (
              <Button
                onClick={() => {
                  setModal({ kind: 'settings', record: settings });
                  setDraft({ ...settings });
                }}
              >
                Edit settings
              </Button>
            )}
          </section>
          <section className="panel">
            <h2>Notification preferences</h2>
            <label className="check">
              <input
                type="checkbox"
                checked={settings?.notifications !== false}
                disabled={!isManager || busy}
                onChange={(e) =>
                  void act({
                    action: 'save',
                    id: settings?.id,
                    data: { notifications: e.target.checked },
                  })
                }
              />
              Enable in-app deadline reminders
            </label>
          </section>
        </>
      );
    }
    if (view === 'Help & Support')
      return (
        <>
          {sectionTitle(
            'Need expert guidance?',
            'Connect your question to the right compliance expertise.',
          )}
          <div className="dashboard-grid">
            <section className="panel">
              <ShieldCheck size={34} />
              <h2>Ask a focused question</h2>
              <p>
                Save a guidance request with the relevant requirement and
                context. Your company’s compliance manager can review it and
                coordinate with an expert.
              </p>
              <Button onClick={() => create('guidance')}>
                Create guidance request <ArrowRight />
              </Button>
              <p className="note">
                Requests stay in this workspace. Contact MCCIA directly to
                arrange external advice.
              </p>
              <a
                href="https://www.mcciapune.com/"
                target="_blank"
                rel="noreferrer"
              >
                Visit MCCIA’s official website ↗
              </a>
            </section>
            <section className="panel">
              <h2>About Compliance Mitra</h2>
              <p>
                A management and tracking workspace for statutory requirements,
                internal audits and continuous improvement.
              </p>
              <p>
                Potential applicability and internal scores require qualified
                review. This application does not provide legal advice,
                government filings or compliance certification.
              </p>
            </section>
          </div>
          {table(records.filter((r) => r.kind === 'guidance'))}
        </>
      );
    const kind =
      view === 'Templates' ? templateType : moduleKind[view] || 'task';
    const rows = records.filter((r) => r.kind === kind);
    return (
      <>
        {sectionTitle(
          view,
          kind === 'requirement'
            ? 'Potential requirements, reviewed and verified by your compliance expert.'
            : kind === 'kaizen'
              ? 'Small improvements. Measurable results.'
              : kind === 'audit'
                ? 'Structured assessments, findings and corrective actions.'
                : 'Keep responsibilities, evidence and deadlines in one place.',
          <div className="actions">
            {exportButtons(filtered(rows), view)}
            {(isManager ||
              (['audit', 'kaizen', 'action'].includes(kind) && isExpert)) && (
              <Button onClick={() => create(kind)}>
                <Plus />
                {kind === 'task'
                  ? 'Create task'
                  : kind === 'requirement'
                    ? 'Add compliance'
                    : kind === 'audit'
                      ? 'Create audit'
                      : kind === 'kaizen'
                        ? 'Create Kaizen'
                        : 'Add record'}
              </Button>
            )}
          </div>,
        )}
        {view === 'Templates' && (
          <div className="tabs">
            <button
              className={templateType === 'compliance-template' ? 'active' : ''}
              onClick={() => setTemplateType('compliance-template')}
            >
              Compliance master
            </button>
            <button
              className={templateType === 'audit-template' ? 'active' : ''}
              onClick={() => setTemplateType('audit-template')}
            >
              Audit templates
            </button>
          </div>
        )}
        {kind === 'requirement' && (
          <div className="callout">
            <ShieldCheck size={20} />
            <span>
              Potentially applicable requirements need CA/CS or authorized
              expert verification before becoming active tasks.
            </span>
          </div>
        )}
        {kind === 'kaizen' && (
          <div className="kpis">
            {[
              ['Total Kaizens', kaizens.length],
              [
                'In progress',
                kaizens.filter((k) => k.status === 'In Progress').length,
              ],
              [
                'Verified / closed',
                kaizens.filter((k) => ['Verified', 'Closed'].includes(k.status))
                  .length,
              ],
              [
                'Potential savings',
                '₹' +
                  kaizens
                    .reduce((n, k) => n + Number(k.expected_savings || 0), 0)
                    .toLocaleString('en-IN'),
              ],
              [
                'Actual savings',
                '₹' +
                  kaizens
                    .reduce((n, k) => n + Number(k.actual_savings || 0), 0)
                    .toLocaleString('en-IN'),
              ],
            ].map(([label, count]) => (
              <div className="kpi" key={label}>
                <span>{label}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        )}
        {kind === 'action' && (
          <div className="risk-summary">
            <h3>Risk matrix · likelihood × impact</h3>
            <div className="risk-cells">
              {[1, 2, 3, 4, 5].flatMap((impact) =>
                [1, 2, 3, 4, 5].map((likelihood) => (
                  <span
                    key={`${impact}-${likelihood}`}
                    className={
                      impact * likelihood >= 15
                        ? 'red'
                        : impact * likelihood >= 8
                          ? 'amber'
                          : 'green'
                    }
                    title={`Likelihood ${likelihood}, impact ${impact}`}
                  >
                    {rows.filter(
                      (a) =>
                        Number(a.likelihood) === likelihood &&
                        Number(a.impact) === impact,
                    ).length || '·'}
                  </span>
                )),
              )}
            </div>
            <small>
              Low: 1–7 · Medium: 8–14 · High: 15–19 · Critical: 20–25
            </small>
          </div>
        )}
        {toolbar(rows)}
        <section className="panel flush">{table(filtered(rows), kind)}</section>
      </>
    );
  }
  return (
    <div className="app-shell">
      <aside className={'sidebar ' + (mobile ? 'mobile-open' : '')}>
        <a className="brand" href="/">
          <img src="/assets/mccia-logo.png" alt="MCCIA" />
          <b>COMPLIANCE MITRA</b>
          <small>MSME Compliance & Audit Management</small>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {allowedNav.map(([name, Icon], i) => (
            <button
              key={name}
              className={
                (view === name ? 'active ' : '') +
                (i === 12 ? 'nav-divider' : '')
              }
              onClick={() => go(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === 'Approvals' && awaiting > 0 && <i>{awaiting}</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <ShieldCheck size={22} />
          <div>
            <b>Built for your business</b>
            <small>An MCCIA Digital Initiative</small>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="app-body">
        <header className="topbar">
          <Button
            className="mobile-toggle"
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </Button>
          <div className="breadcrumb">
            Workspace <span>/</span> <b>{view}</b>
          </div>
          <span className="spacer" />
          <div className="global-search">
            <Search size={16} />
            <input
              placeholder="Search your workspace…"
              aria-label="Global search"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            onClick={() => setNotifications(!notifications)}
          >
            <Bell />
            {records.some(
              (r) => r.kind === 'notification' && r.status === 'Unread',
            ) && <i className="notification-dot" />}
          </Button>
          <div className="user-menu">
            <span className="avatar">
              {user.name
                .split(' ')
                .map((s: string) => s[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div>
              <b>{user.name}</b>
              {company.demo ? (
                <select
                  aria-label="Demo role"
                  value={user.role}
                  onChange={async (e) => {
                    try {
                      await request(
                        { action: 'demo-role', role: e.target.value },
                        '/api/auth',
                      );
                      setSelected(null);
                      setView('Dashboard');
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  {roles.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              ) : (
                <small>{user.role}</small>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={async () => {
              await request({ action: 'logout' }, '/api/auth');
              window.location.href = '/login';
            }}
          >
            <LogOut />
          </Button>
        </header>
        <main className="workspace-main">
          {error && (
            <div className="error-banner" role="alert">
              <TriangleAlert size={18} />
              {error}
              <button onClick={() => setError('')} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}
          {globalSearch && !selected ? (
            <>
              {sectionTitle('Search results', `Results for “${globalSearch}”`)}
              {table(
                records.filter(
                  (r) =>
                    [
                      'task',
                      'audit',
                      'kaizen',
                      'action',
                      'requirement',
                      'licence',
                    ].includes(r.kind) &&
                    JSON.stringify(r)
                      .toLowerCase()
                      .includes(globalSearch.toLowerCase()),
                ),
              )}
              {documentList(
                files.filter((f) =>
                  f.name.toLowerCase().includes(globalSearch.toLowerCase()),
                ),
              )}
              <section className="panel">
                <h2>People</h2>
                {users
                  .filter((u) =>
                    u.name.toLowerCase().includes(globalSearch.toLowerCase()),
                  )
                  .map((u) => (
                    <p key={u.id}>
                      {u.name} · {u.role}
                    </p>
                  ))}
              </section>
            </>
          ) : (
            mainView()
          )}
          <footer>
            Compliance Mitra · An MCCIA Digital Initiative{' '}
            <span>
              Internal compliance tracking. Consult your CA/CS or authorized
              expert where required.
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <output className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </output>
      )}
      <Dialog open={notifications} onOpenChange={setNotifications}>
        <DialogContent className="modal-content">
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription>
            Deadline reminders, submissions and reviewer decisions.
          </DialogDescription>
          <Button
            variant="outline"
            onClick={() =>
              void act(
                { action: 'read-notifications' },
                'Notifications marked as read',
              )
            }
          >
            Mark all as read
          </Button>
          {records
            .filter(
              (r) =>
                r.kind === 'notification' &&
                (!r.owner_id || r.owner_id === user.id || isManager),
            )
            .map((n) => (
              <button
                className="notification-item"
                key={n.id}
                onClick={() => {
                  const r = records.find((x) => x.id === n.parent_id);
                  if (r) {
                    open(r);
                    setNotifications(false);
                  }
                }}
              >
                <Badge value={n.status} />
                <p>{n.title}</p>
                <small>{dateLabel(n.date)}</small>
              </button>
            ))}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!modal}
        onOpenChange={(o) => {
          if (!o) {
            setModal(null);
            if (selectedRow) setDraft({ ...selectedRow });
          }
        }}
      >
        <DialogContent className="modal-content">
          <DialogTitle>
            {modal?.kind === 'verification'
              ? 'Verify compliance applicability'
              : modal?.kind === 'delete-file'
                ? 'Delete document?'
                : modal?.kind === 'upload'
                  ? 'Upload supporting document'
                  : modal?.kind === 'company'
                    ? 'Edit company profile'
                    : modal?.kind === 'user'
                      ? 'Team member'
                      : modal?.kind === 'settings'
                        ? 'Configure workspace'
                        : `Create ${(modal?.kind || 'record').replaceAll('-', ' ')}`}
          </DialogTitle>
          <DialogDescription>
            {modal?.kind === 'delete-file'
              ? 'This removes the stored file. Evidence linked to approved work cannot be deleted.'
              : 'Save your changes to the company workspace.'}
          </DialogDescription>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {modal?.kind === 'delete-file' ? (
            <>
              <p>{modal.file.name}</p>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await fetch('/api/files', {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: modal.file.id }),
                    });
                    const b = (await res.json()) as any;
                    if (!res.ok) throw Error(b.error);
                    setModal(null);
                    await load();
                    setToast('Document deleted');
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Delete document
              </Button>
            </>
          ) : modal?.kind === 'upload' ? (
            <>
              <FieldInput
                field={{
                  key: 'category',
                  label: 'Category',
                  type: 'select',
                  options: categories,
                }}
                value={draft.category}
                users={users}
                records={records}
                onChange={(v) => setDraft({ ...draft, category: v })}
              />
              <label>
                Link to compliance or audit
                <select
                  value={draft.record_id || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, record_id: e.target.value })
                  }
                >
                  <option value="">Company document</option>
                  {records
                    .filter((r) =>
                      ['task', 'audit', 'kaizen', 'action'].includes(r.kind),
                    )
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                </select>
              </label>
              {uploadControl(draft.record_id, draft.category, () =>
                setModal(null),
              )}
              <small>
                PDF, PNG, JPG, XLSX, DOCX, CSV or TXT · maximum 10 MB
              </small>
            </>
          ) : modal?.kind === 'verification' ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await act(
                    {
                      action: 'verify-requirement',
                      id: modal.record.id,
                      ...draft,
                    },
                    'Expert review saved; applicable work is now scheduled',
                  )
                ) {
                  setModal(null);
                  setSelected(null);
                }
              }}
            >
              <label>
                Decision
                <select
                  value={draft.decision}
                  onChange={(e) =>
                    setDraft({ ...draft, decision: e.target.value })
                  }
                >
                  {['Applicable', 'Not Applicable', 'Needs Clarification'].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Expert remarks
                <textarea
                  required
                  value={draft.remarks}
                  onChange={(e) =>
                    setDraft({ ...draft, remarks: e.target.value })
                  }
                />
              </label>
              <label>
                Source / reference
                <input
                  required
                  value={draft.source}
                  onChange={(e) =>
                    setDraft({ ...draft, source: e.target.value })
                  }
                />
              </label>
              <Button type="submit" disabled={busy}>
                Save verification
              </Button>
            </form>
          ) : (
            modal && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const payload =
                    modal.kind === 'company'
                      ? { action: 'company', data: draft }
                      : modal.kind === 'user'
                        ? { action: 'user', data: draft }
                        : modal.kind === 'settings'
                          ? { action: 'save', id: modal.record.id, data: draft }
                          : { action: 'create', kind: modal.kind, data: draft };
                  const res = await act(payload);
                  if (res) {
                    setModal(null);
                    if (selectedRow) setDraft({ ...selectedRow });
                  }
                }}
              >
                {fieldList(modal.kind, draft, setDraft)}
                {modal.kind === 'task' &&
                  !records.some(
                    (r) => r.kind === 'requirement' && r.status === 'Verified',
                  ) && (
                    <p className="note">
                      An expert must verify a compliance requirement before a
                      task can be created.
                    </p>
                  )}
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save record'}
                </Button>
              </form>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
