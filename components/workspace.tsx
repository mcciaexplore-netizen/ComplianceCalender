'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import WorkspaceHeader from '@/components/workspace-header';
import {
  Avatar,
  ComplianceCard,
  EmptyState,
  FileUpload,
  FilterPills,
  KpiCard,
  PageHeader,
  professionalDisclaimer,
  StatusBadge as Badge,
  statusTone,
} from '@/components/compliance-ui';
import AccessLayout, { WorkspaceLoading } from '@/components/access-layout';
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
  Search,
  Plus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
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
  const demoRequest = useRef<Promise<Response> | null>(null);
  const loadVersion = useRef(0);
  const [data, setData] = useState<Row | null>(null),
    [loading, setLoading] = useState(true),
    [view, setView] = useState('Dashboard'),
    [search, setSearch] = useState(''),
    [globalSearch, setGlobalSearch] = useState(''),
    [status, setStatus] = useState('All statuses'),
    [dept, setDept] = useState('All departments'),
    [ownerFilter, setOwnerFilter] = useState('All people'),
    [categoryFilter, setCategoryFilter] = useState('All'),
    [frequencyFilter, setFrequencyFilter] = useState('All frequencies'),
    [riskFilter, setRiskFilter] = useState('All priorities'),
    [taskTab, setTaskTab] = useState('All'),
    [docType, setDocType] = useState('All types'),
    [docRecord, setDocRecord] = useState('All compliance'),
    [docYear, setDocYear] = useState('All years'),
    [reportMonth, setReportMonth] = useState(today().slice(0, 7)),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [toast, setToast] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState<Row | null>(null),
    [draft, setDraft] = useState<Row>({}),
    [selected, setSelected] = useState<string | null>(null),
    [tab, setTab] = useState('Overview'),
    [comment, setComment] = useState(''),
    [calendarDate, setCalendarDate] = useState(new Date()),
    [calendarMode, setCalendarMode] = useState('Month'),
    [reportType, setReportType] = useState('Monthly Compliance Report'),
    [templateType, setTemplateType] = useState('compliance-template');
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    const openDemo =
      new URLSearchParams(window.location.search).get('demo') === '1';
    try {
      let res = await fetch('/api/workspace');
      if (res.status === 401 && openDemo) {
        // Reuse the pending request if React repeats the mount effect.
        demoRequest.current ??= fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'demo' }),
        });
        const demoResponse = await demoRequest.current;
        if (!demoResponse.ok) {
          const failure = (await demoResponse.clone().json()) as {
            error?: string;
          };
          throw Error(
            failure.error || 'The demo could not open. Please try again.',
          );
        }
        res = await fetch('/api/workspace');
      }
      if (res.status === 401) {
        if (version === loadVersion.current) setData(null);
        return;
      }
      const b = (await res.json()) as any;
      if (!res.ok) throw Error(b.error);
      if (version !== loadVersion.current) return;
      setData(b);
      const url = new URL(window.location.href);
      if (url.searchParams.has('demo')) {
        url.searchParams.delete('demo');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    } catch (e) {
      if (version === loadVersion.current) setError((e as Error).message);
    } finally {
      if (version === loadVersion.current) setLoading(false);
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
      ' | Compliance Calendar';
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
    setCategoryFilter('All');
    setFrequencyFilter('All frequencies');
    setRiskFilter('All priorities');
    setTaskTab('All');
    setFrom('');
    setTo('');
    setDocType('All types');
    setDocRecord('All compliance');
    setDocYear('All years');
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
  if (loading) return <WorkspaceLoading />;
  if (!data)
    return (
      <AccessLayout>
        <div className="eyebrow">WELCOME TO COMPLIANCE CALENDAR</div>
        <h2>
          See your business.
          <br />
          Stay ahead of the work.
        </h2>
        <p>
          Explore the complete dashboard with a sample manufacturing company, or
          sign in to your company’s workspace.
        </p>
        <div className="access-demo-summary">
          <Building2 size={23} />
          <div>
            <b>ABC Precision Components Pvt. Ltd.</b>
            <small>Demo company · Tasks, audits, documents &amp; reports</small>
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="access-actions">
          <Button
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
            {busy ? 'Opening dashboard…' : 'Explore demo dashboard'}{' '}
            <ArrowRight size={17} />
          </Button>
          <Button
            variant="outline"
            render={<a href="/login" aria-label="Sign in" />}
          >
            Sign in to your company
          </Button>
        </div>
        <div className="access-register">
          New to Compliance Calendar?{' '}
          <a href="/register">
            Create a company account <ArrowRight size={14} />
          </a>
        </div>
        <div className="access-demo-note">
          <ShieldCheck size={16} />
          <span>
            The demo is a separate workspace. Switch between all seven roles to
            try the complete workflow.
          </span>
        </div>
      </AccessLayout>
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
        (categoryFilter === 'All' || r.category === categoryFilter) &&
        (frequencyFilter === 'All frequencies' ||
          r.frequency === frequencyFilter) &&
        (riskFilter === 'All priorities' ||
          (r.priority || r.risk || 'Not set') === riskFilter) &&
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
  const fieldGroups = (kind: string): [string, string[]][] =>
    kind === 'company'
      ? [
          [
            'Business Information',
            [
              'name',
              'legal_name',
              'industry',
              'business_type',
              'structure',
              'stage',
            ],
          ],
          [
            'Locations',
            [
              'address',
              'state',
              'district',
              'additional_locations',
              'factory_locations',
              'branch_locations',
            ],
          ],
          [
            'Financial & Employee Information',
            [
              'turnover',
              'investment',
              'employees',
              'male',
              'female',
              'contract',
            ],
          ],
          [
            'Registrations',
            [
              'gst',
              'pan',
              'tan',
              'udyam',
              'pf',
              'esic',
              'pt',
              'iec',
              'factory_registration',
              'other_registrations',
            ],
          ],
        ]
      : kind === 'task'
        ? [
            [
              'Compliance Overview',
              ['title', 'requirement_id', 'category', 'description'],
            ],
            [
              'Responsibility & Schedule',
              [
                'department',
                'owner_id',
                'reviewer_id',
                'due',
                'start',
                'period',
                'priority',
                'frequency',
              ],
            ],
          ]
        : kind === 'requirement'
          ? [
              [
                'Compliance Overview',
                [
                  'title',
                  'category',
                  'frequency',
                  'authority',
                  'description',
                  'applicable_to',
                ],
              ],
              [
                'Responsibility & Schedule',
                ['department', 'owner_id', 'reviewer_id', 'due', 'due_rule'],
              ],
              ['What Needs to Be Done', ['checklist']],
            ]
          : kind === 'kaizen'
            ? [
                [
                  'Improvement Overview',
                  [
                    'title',
                    'department',
                    'area',
                    'audit_date',
                    'category',
                    'owner_id',
                    'reviewer_id',
                    'due',
                  ],
                ],
                [
                  'Problem & Root Cause',
                  ['problem', 'current', 'root_cause', 'root_category'],
                ],
                [
                  'Action & Expected Result',
                  ['improvement', 'proposed_action', 'expected_result'],
                ],
                ['Before & After', ['before_condition', 'after_condition']],
                [
                  'Benefits & Verification',
                  [
                    'benefit',
                    'expected_savings',
                    'actual_savings',
                    'time_saved',
                    'auditor_comments',
                  ],
                ],
              ]
            : [['', (fields[kind] || []).map((f) => f.key)]];
  const reminderOptions = (
    key: string,
    value: string,
    onChange: (value: string) => void,
    disabled = false,
  ) => {
    const defaults = key === 'licence_alerts' ? '90,60,30,15,7' : '15,7,2,0';
    const chosen = String(value || defaults)
      .split(',')
      .map(Number)
      .filter(Number.isFinite);
    const options = Array.from(
      new Set([
        ...(key === 'licence_alerts' ? [90, 60, 30, 15, 7, 0] : [15, 7, 2, 0]),
        ...chosen,
      ]),
    ).sort((a, b) => b - a);
    return (
      <div className="reminder-options">
        {options.map((day) => (
          <label key={day} className="check">
            <input
              type="checkbox"
              checked={chosen.includes(day)}
              disabled={
                disabled || (chosen.length === 1 && chosen.includes(day))
              }
              onChange={(e) =>
                onChange(
                  (e.target.checked
                    ? [...chosen, day]
                    : chosen.filter((d) => d !== day)
                  )
                    .sort((a, b) => b - a)
                    .join(','),
                )
              }
            />
            {day === 0
              ? 'On due date'
              : day > 0
                ? day + ' days before'
                : Math.abs(day) + ' days overdue'}
          </label>
        ))}
      </div>
    );
  };
  const fieldList = (kind: string, d: Row, onChange: (d: Row) => void) =>
    kind === 'settings' ? (
      <>
        <div className="form-grid">
          {fields.settings
            .filter((f) => !['reminders', 'licence_alerts'].includes(f.key))
            .map((f) => (
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
        <h3>Task Reminder Schedule</h3>
        {reminderOptions('reminders', d.reminders, (v) =>
          onChange({ ...d, reminders: v }),
        )}
        <h3>Licence Renewal Alerts</h3>
        {reminderOptions('licence_alerts', d.licence_alerts, (v) =>
          onChange({ ...d, licence_alerts: v }),
        )}
        <p className="note">
          Keep at least one day selected. Turn off in-app reminders in
          Notification Preferences to pause all reminders.
        </p>
        <details className="advanced-reminders">
          <summary>Custom reminder days</summary>
          <div className="form-grid">
            {fields.settings
              .filter((f) => ['reminders', 'licence_alerts'].includes(f.key))
              .map((f) => (
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
        </details>
      </>
    ) : (
      <>
        {fieldGroups(kind).map(([title, keys]) => (
          <section className="form-section" key={title}>
            {title && <h3>{title}</h3>}
            <div className="form-grid">
              {keys
                .map((key) => fields[kind]?.find((f) => f.key === key))
                .filter((f): f is Field => !!f)
                .map((f) => (
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
          </section>
        ))}
      </>
    );
  const toolbar = (rows: Row[]) => (
    <div className="toolbar">
      <div className="search">
        <Search size={16} />
        <input
          aria-label="Search records"
          placeholder={
            view === 'Requirements' ? 'Search compliance…' : 'Search records…'
          }
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
            rows
              .map((r) =>
                ['task', 'licence', 'action'].includes(r.kind)
                  ? taskStatus(r)
                  : r.status,
              )
              .filter(Boolean),
          ),
        ).map((value) => (
          <option key={value} value={value}>
            {value === 'Awaiting Approval'
              ? 'Pending Review'
              : value === 'Returned'
                ? 'Correction Required'
                : value}
          </option>
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
      <details className="filters-extra">
        <summary className="text-button">
          <SlidersHorizontal size={13} /> More filters
          {frequencyFilter !== 'All frequencies' ||
          riskFilter !== 'All priorities' ||
          from ||
          to
            ? ' · Active'
            : ''}
        </summary>
        <div className="filter-options">
          <select
            aria-label="Filter frequency"
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
          >
            <option>All frequencies</option>
            {Array.from(
              new Set(rows.map((r) => r.frequency).filter(Boolean)),
            ).map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
          <select
            aria-label="Filter risk or priority"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option>All priorities</option>
            {Array.from(
              new Set(rows.map((r) => r.priority || r.risk || 'Not set')),
            ).map((f) => (
              <option key={f}>{f}</option>
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
          <button
            className="text-button"
            onClick={() => {
              setSearch('');
              setStatus('All statuses');
              setDept('All departments');
              setOwnerFilter('All people');
              setCategoryFilter('All');
              setFrequencyFilter('All frequencies');
              setRiskFilter('All priorities');
              setFrom('');
              setTo('');
            }}
          >
            Clear filters
          </button>
        </div>
      </details>
    </div>
  );
  const recordCard = (r: Row, evidence = false) => {
    const requirement = records.find((x) => x.id === r.requirement_id);
    return (
      <ComplianceCard
        key={r.id}
        title={r.title}
        authority={r.authority || requirement?.authority || r.source}
        frequency={r.frequency}
        category={r.category || requirement?.category}
        due={r.due || r.expiry}
        dueLabel={dateLabel(r.due || r.expiry)}
        owner={person(r.owner_id)}
        status={
          ['task', 'licence', 'action'].includes(r.kind)
            ? taskStatus(r)
            : r.status
        }
        priority={r.priority || r.risk}
        detail={
          r.kind === 'audit'
            ? 'Audit score: ' + auditScore(r) + '%'
            : r.kind === 'kaizen'
              ? 'Actual savings: ₹' +
                Number(r.actual_savings || 0).toLocaleString('en-IN')
              : requirement
                ? 'Compliance: ' + requirement.title
                : undefined
        }
        onOpen={() => open(r)}
        onEvidence={
          evidence &&
          ![
            'Completed',
            'Closed',
            'Verified',
            'Awaiting Approval',
            'Submitted',
            'Under Review',
            'Implemented',
          ].includes(r.status) &&
          (isManager ||
            isExpert ||
            r.owner_id === user.id ||
            r.reviewer_id === user.id)
            ? () => {
                open(r);
                setTab('Documents');
              }
            : undefined
        }
      />
    );
  };
  const table = (rows: Row[], type = '') =>
    !rows.length ? (
      <EmptyState />
    ) : (
      <>
        <div className="table-wrap records-table">
          <table>
            <thead>
              <tr>
                <th>
                  {type === 'kaizen'
                    ? 'Improvement'
                    : type === 'audit'
                      ? 'Audit'
                      : 'Compliance / activity'}
                </th>
                <th>Category / department</th>
                <th>Due date</th>
                <th>Responsible</th>
                <th>
                  {type === 'audit'
                    ? 'Score'
                    : type === 'kaizen'
                      ? 'Savings'
                      : 'Priority / risk'}
                </th>
                <th>Status</th>
                <th>Last action</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id || r.title}>
                  <td>
                    <button className="record-link" onClick={() => open(r)}>
                      {r.title}
                    </button>
                    <small>
                      {[
                        r.authority || r.source,
                        r.frequency || r.period || r.type,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </small>
                  </td>
                  <td>
                    {r.category || '—'}
                    <small>{r.department}</small>
                  </td>
                  <td>{dateLabel(r.due || r.expiry)}</td>
                  <td>
                    <div className="person">
                      <Avatar name={person(r.owner_id)} />
                      <span>{person(r.owner_id)}</span>
                    </div>
                  </td>
                  <td>
                    {type === 'audit'
                      ? auditScore(r) + '%'
                      : type === 'kaizen'
                        ? '₹' +
                          Number(r.actual_savings || 0).toLocaleString('en-IN')
                        : r.priority || r.risk || 'Not set'}
                  </td>
                  <td>
                    <Badge
                      value={
                        ['task', 'licence', 'action'].includes(r.kind)
                          ? taskStatus(r)
                          : r.status
                      }
                    />
                  </td>
                  <td>{r.updated ? dateLabel(r.updated) : '—'}</td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => open(r)}
                      aria-label={'View ' + r.title}
                    >
                      View
                      <ArrowRight size={13} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-records">{rows.map((r) => recordCard(r))}</div>
      </>
    );
  const sectionTitle = (
    title: string,
    sub: string,
    button?: React.ReactNode,
  ) => <PageHeader title={title} description={sub} action={button} />;
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
    const dueOrder = (a: Row, b: Row) =>
      (a.due || '').localeCompare(b.due || '');
    const overdueTasks = tasks
      .filter((t) => taskStatus(t) === 'Overdue')
      .sort(dueOrder);
    const upcoming = tasks
      .filter((t) => t.status !== 'Completed' && t.due >= today())
      .sort(dueOrder);
    const todayTasks = tasks.filter(
      (t) => t.due === today() && t.status !== 'Completed',
    );
    const reviewTasks = tasks.filter(
      (t) =>
        t.status === 'Awaiting Approval' &&
        (isManager || isExpert || t.reviewer_id === user.id),
    );
    const activity = records.filter((r) => r.kind === 'activity').slice(0, 5);
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
          'Compliance Dashboard',
          'Stay on top of your company’s upcoming and overdue compliance requirements.',
          isManager ? (
            <Button onClick={() => create('task')}>
              <Plus size={16} />
              Add Task
            </Button>
          ) : (
            <Button variant="outline" onClick={() => go('My Tasks')}>
              View my tasks
              <ArrowRight size={15} />
            </Button>
          ),
        )}
        <div className="dashboard-topline">
          <span className="monitoring-status">
            <i />
            Compliance Monitoring Active
          </span>
          <span>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
        <div className="kpis">
          <KpiCard
            label="Total Compliance"
            value={tasks.length}
            note="Tracked compliance tasks"
            icon={ListChecks}
            onClick={() => go('My Tasks')}
          />
          <KpiCard
            label="Due Soon"
            value={dueSoon}
            note="Within the next 7 days"
            icon={Clock}
            tone="amber"
            onClick={() => {
              go('My Tasks');
              setStatus('Due Soon');
            }}
          />
          <KpiCard
            label="Overdue"
            value={overdue}
            note="Requires attention"
            icon={TriangleAlert}
            tone="red"
            onClick={() => {
              go('My Tasks');
              setTaskTab('Overdue');
            }}
          />
          <KpiCard
            label="Completed"
            value={complete}
            note="Approved and evidenced"
            icon={CheckCircle2}
            tone="green"
            onClick={() => {
              go('My Tasks');
              setTaskTab('Completed');
            }}
          />
        </div>
        <section className="panel health-section">
          <div className="health-main">
            <h2>Compliance Health</h2>
            <strong>{health}%</strong>
            <span
              className={'health-state ' + (health >= 80 ? 'green' : 'amber')}
            >
              {!tasks.length
                ? 'No tasks yet'
                : health >= 80
                  ? 'On track'
                  : health >= 50
                    ? 'Needs attention'
                    : 'Action needed'}
            </span>
            <progress
              value={health}
              max={100}
              aria-label="Internal compliance health"
            />
            <small>
              Internal tracking indicator, based on tasks, deadlines, reviews
              and open findings.
            </small>
          </div>
          <div className="health-breakdown">
            {[
              [complete, 'Completed', 'green'],
              [dueSoon, 'Due Soon', 'amber'],
              [overdue, 'Overdue', 'red'],
              [awaiting, 'Pending Review', 'blue'],
            ].map(([count, label, tone]) => (
              <div key={label}>
                <strong className={String(tone)}>{count}</strong>
                <small>{label}</small>
              </div>
            ))}
          </div>
        </section>
        {overdueTasks.length > 0 && (
          <section className="deadline-section">
            <div className="panel-heading">
              <div>
                <h2>
                  Requires Attention{' '}
                  <span className="section-count">{overdueTasks.length}</span>
                </h2>
                <p>Overdue tasks that need a next step.</p>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  go('My Tasks');
                  setTaskTab('Overdue');
                }}
              >
                View all overdue
                <ArrowRight size={13} />
              </button>
            </div>
            <div className="compliance-list">
              {overdueTasks.slice(0, 2).map((r) => recordCard(r, true))}
            </div>
          </section>
        )}
        <section className="deadline-section">
          <div className="panel-heading">
            <div>
              <h2>
                Upcoming Deadlines{' '}
                <span className="section-count">{upcoming.length}</span>
              </h2>
              <p>Your next compliance commitments, in due-date order.</p>
            </div>
            <button
              className="text-button"
              onClick={() => go('Compliance Calendar')}
            >
              View calendar
              <ArrowRight size={13} />
            </button>
          </div>
          {upcoming.length ? (
            <div className="compliance-list">
              {upcoming.slice(0, 3).map((r) => recordCard(r, true))}
            </div>
          ) : (
            <section className="panel">
              <EmptyState
                title="No upcoming deadlines"
                description="Scheduled compliance tasks will appear here."
                icon={CalendarDays}
              />
            </section>
          )}
        </section>
        <div className="dashboard-grid">
          <section className="panel">
            <div className="panel-heading">
              <h2>
                Today’s Tasks{' '}
                <span className="section-count">{todayTasks.length}</span>
              </h2>
              <button
                className="text-button"
                onClick={() => {
                  go('My Tasks');
                  setTaskTab('Today');
                }}
              >
                View tasks
                <ArrowRight size={13} />
              </button>
            </div>
            {todayTasks.length ? (
              todayTasks.slice(0, 5).map((t) => (
                <div className="compact-task" key={t.id}>
                  <ListChecks size={17} />
                  <div className="spacer">
                    <button className="record-link" onClick={() => open(t)}>
                      {t.title}
                    </button>
                    <small>
                      {person(t.owner_id)} · {t.priority || 'Priority not set'}
                    </small>
                  </div>
                  <Badge value={taskStatus(t)} />
                </div>
              ))
            ) : (
              <EmptyState
                title="No tasks due today"
                description="Check your upcoming deadlines to plan the next few days."
                icon={CheckCircle2}
              />
            )}
          </section>
          <div className="dashboard-section-stack">
            {isReviewer && (
              <section className="panel">
                <div className="panel-heading">
                  <h2>
                    Pending Approvals{' '}
                    <span className="section-count">{reviewTasks.length}</span>
                  </h2>
                  <button
                    className="text-button"
                    onClick={() => go('Approvals')}
                  >
                    View all
                    <ArrowRight size={13} />
                  </button>
                </div>
                {reviewTasks.length ? (
                  reviewTasks.slice(0, 2).map((t) => (
                    <div className="compact-task" key={t.id}>
                      <Avatar name={person(t.owner_id)} />
                      <div className="spacer">
                        <button
                          className="record-link"
                          onClick={() => {
                            open(t);
                            setTab('Approval');
                          }}
                        >
                          {t.title}
                        </button>
                        <small>
                          {person(t.owner_id)} ·{' '}
                          {files.filter((f) => f.record_id === t.id).length}{' '}
                          attachments
                        </small>
                      </div>
                      <ArrowRight size={14} />
                    </div>
                  ))
                ) : (
                  <p className="note">
                    You’re all caught up. No submissions need your review.
                  </p>
                )}
              </section>
            )}
            <section className="panel">
              <h2>Quick Actions</h2>
              <div className="quick-actions">
                {isManager && (
                  <button onClick={() => create('requirement')}>
                    <Plus size={16} />
                    Add Compliance
                  </button>
                )}
                <button
                  onClick={() => {
                    if (user.role === 'Employee') go('My Tasks');
                    else {
                      setModal({ kind: 'upload' });
                      setDraft({ category: 'Other' });
                    }
                  }}
                >
                  <Upload size={16} />
                  Upload Document
                </button>
                <button onClick={() => go('Compliance Calendar')}>
                  <CalendarDays size={16} />
                  View Calendar
                </button>
                {isReviewer && (
                  <button onClick={() => go('Approvals')}>
                    <CheckCircle2 size={16} />
                    Review Submissions
                  </button>
                )}
                {user.role !== 'Employee' && (
                  <button onClick={() => go('Reports')}>
                    <Download size={16} />
                    Download Report
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
        <div className="dashboard-bottom">
          <section className="panel">
            <div className="panel-heading">
              <h2>Compliance by Category</h2>
              <span className="legend">
                ● Completed <span>● Pending</span>
              </span>
            </div>
            {categoryData.length ? (
              <div className="chart">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={categoryData}>
                    <CartesianGrid vertical={false} stroke="#edf0f4" />
                    <XAxis
                      dataKey="category"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={24}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="completed"
                      name="Completed"
                      stackId="a"
                      fill="#6485c7"
                      maxBarSize={26}
                    />
                    <Bar
                      dataKey="pending"
                      name="Pending"
                      stackId="a"
                      fill="#e2e9f5"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={26}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="Your category overview starts here"
                description="Add verified requirements and tasks to see the breakdown."
              />
            )}
          </section>
          <section className="panel">
            <h2>Recent Activity</h2>
            <div className="timeline">
              {activity.map((a) => (
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
            {!activity.length && (
              <p className="note">
                Activity will appear as your team works on compliance.
              </p>
            )}
          </section>
        </div>
        <div className="guidance-banner">
          <ShieldCheck size={22} />
          <div>
            <h3>Need expert guidance?</h3>
            <p>
              Connect a requirement or question with your company’s compliance
              expert.
            </p>
          </div>
          <Button variant="outline" onClick={() => go('Help & Support')}>
            Request guidance
            <ArrowRight size={14} />
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
    const periodTasks = filteredTasks.filter((t) =>
      calendarMode === 'Year'
        ? t.due?.startsWith(String(y))
        : calendarMode === 'Week'
          ? days.some((d) => iso(d) === t.due)
          : t.due?.startsWith(iso(new Date(y, m, 1)).slice(0, 7)),
    );
    return (
      <>
        {sectionTitle(
          'Compliance Calendar',
          'Track all statutory deadlines, renewals and compliance activities.',
          <div className="actions">
            {exportButtons(periodTasks, 'Compliance Calendar')}
            {isManager && (
              <Button onClick={() => create('requirement')}>
                <Plus />
                Add Compliance
              </Button>
            )}
          </div>,
        )}
        <FilterPills
          label="Compliance categories"
          value={categoryFilter}
          options={['All', ...categories]}
          onChange={setCategoryFilter}
        />
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
                      calendarMode === 'Week' ? calendarDate.getDate() - 7 : 1,
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
                      calendarMode === 'Week' ? calendarDate.getDate() + 7 : 1,
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
            table(periodTasks)
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
                        className={'event ' + statusTone(taskStatus(t))}
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
        {(calendarMode === 'Month' || calendarMode === 'Week') && (
          <section className="calendar-mobile-agenda">
            <h3>Deadlines in this {calendarMode.toLowerCase()}</h3>
            <div className="compliance-list">
              {filteredTasks
                .filter((t) =>
                  calendarMode === 'Week'
                    ? days.some((d) => iso(d) === t.due)
                    : t.due?.startsWith(iso(new Date(y, m, 1)).slice(0, 7)),
                )
                .sort((a, b) => (a.due || '').localeCompare(b.due || ''))
                .map((t) => recordCard(t))}
            </div>
          </section>
        )}
        {company.demo && (
          <p className="note">
            Demo dates are illustrative. Confirm each due-date rule with a
            qualified expert.
          </p>
        )}
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
                {f.category} · v{f.version} · {(f.size / 1024).toFixed(1)} KB
              </small>
              <small>
                Uploaded by {person(f.uploaded_by)} · {dateLabel(f.created)}
                {f.record_id
                  ? ' · ' +
                    (records.find((r) => r.id === f.record_id)?.title ||
                      'Linked record')
                  : ' · Company document'}
              </small>
            </div>
            <div className="document-actions">
              <Button
                variant="ghost"
                render={
                  <a
                    href={'/api/files?id=' + f.id + '&preview=1'}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={'Preview ' + f.name}
                  />
                }
              >
                Preview
              </Button>
              <Button
                variant="outline"
                render={
                  <a
                    href={'/api/files?id=' + f.id}
                    aria-label={'Download ' + f.name}
                  />
                }
              >
                <Download size={14} />
                Download
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={'Delete ' + f.name}
                onClick={() => {
                  setModal({ kind: 'delete-file', file: f });
                  setError('');
                }}
              >
                <X size={15} />
              </Button>
            </div>
          </article>
        ))}
        {!list.length && (
          <EmptyState
            title="No documents found"
            description="Upload supporting evidence or adjust your search and filters."
            icon={FolderOpen}
          />
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
      <FileUpload
        busy={busy}
        title={recordId ? 'Filing Evidence' : 'Upload Document'}
        onUpload={async (file) => {
          const fid = await upload(file, recordId, category);
          if (fid && after) after(fid);
        }}
      />
    );
  }
  function details(r: Row) {
    const linked = records.filter((x) => x.parent_id === r.id),
      documents = files.filter((f) => f.record_id === r.id),
      editable = ![
        'Completed',
        'Closed',
        'Verified',
        'Awaiting Approval',
        'Submitted',
        'Under Review',
        'Implemented',
      ].includes(r.status);
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
            Due <b>{dateLabel(r.due || r.expiry)}</b>
          </span>
          <span>
            Priority / Risk <b>{r.priority || r.risk || 'Not set'}</b>
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
              {t === 'Approval'
                ? 'Review & Approval'
                : t === 'Activity'
                  ? 'Activity History'
                  : t === 'Documents'
                    ? 'Evidence & Documents'
                    : t === 'Comments'
                      ? 'Notes & Comments'
                      : t}
            </button>
          ))}
        </div>
        <div className="detail-layout">
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
                    <h3 className="wide">Filing Information</h3>
                    {[
                      {
                        key: 'filing_date',
                        label: 'Filing date',
                        type: 'date',
                      },
                      {
                        key: 'payment_amount',
                        label: 'Payment amount (INR)',
                        type: 'number',
                      },
                      {
                        key: 'acknowledgement',
                        label: 'Acknowledgement number',
                      },
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
                                    j === i
                                      ? { ...x, title: e.target.value }
                                      : x,
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
                                    j === i
                                      ? { ...x, type: e.target.value }
                                      : x,
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
                            checklist: draft.checklist.map(
                              (x: Row, j: number) =>
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
                <h2>Review & Approval</h2>
                <p>
                  Reviewer: <b>{person(r.reviewer_id)}</b>
                </p>
                <Badge value={r.status} />
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
          <aside className="panel detail-context">
            <h3>Compliance at a glance</h3>
            <dl>
              {[
                [
                  'Authority',
                  r.authority ||
                    records.find((x) => x.id === r.requirement_id)?.authority ||
                    'Not specified',
                ],
                ['Frequency', r.frequency || 'Not specified'],
                [
                  'Applicable to',
                  r.applicable_to || 'See verified requirement',
                ],
                ['Responsible', person(r.owner_id)],
                ['Reviewer', person(r.reviewer_id)],
                ['Evidence', documents.length + ' documents'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {r.description && (
              <div className="callout">
                <h3>What needs to be done</h3>
                <p>{r.description}</p>
              </div>
            )}
            {r.requirement_id && (
              <button
                className="context-link text-button"
                onClick={() => {
                  const requirement = records.find(
                    (x) => x.id === r.requirement_id,
                  );
                  if (requirement) open(requirement);
                }}
              >
                Open compliance requirement
                <ArrowRight size={13} />
              </button>
            )}
            {r.source && /^https?:\/\//.test(r.source) && (
              <a
                className="context-link"
                href={r.source}
                target="_blank"
                rel="noreferrer"
              >
                Official portal / source ↗
              </a>
            )}
            {r.kind === 'requirement' && (
              <>
                <h3 className="context-heading">Linked submissions</h3>
                {tasks
                  .filter((t) => t.requirement_id === r.id)
                  .map((t) => (
                    <div className="compact-task" key={t.id}>
                      <div>
                        <button className="record-link" onClick={() => open(t)}>
                          {t.title}
                        </button>
                        <small>
                          {dateLabel(t.due)} · {taskStatus(t)}
                        </small>
                      </div>
                    </div>
                  ))}
                {!tasks.some((t) => t.requirement_id === r.id) && (
                  <p className="note">No scheduled tasks yet.</p>
                )}
              </>
            )}
          </aside>
        </div>
        {transitions[r.kind]?.[r.status] && (
          <section className="workflow-bar workflow">
            <div>
              <b>
                {r.status === 'Awaiting Approval'
                  ? 'Review & Approval'
                  : 'Next Action'}
              </b>
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
                    if (next === 'Returned' && !comment.trim()) {
                      setError(
                        'Add a correction reason before returning this submission.',
                      );
                      return;
                    }
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
          'Company Profile',
          'Your business information, registrations and compliance configuration.',
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
            {fieldGroups('company').map(([title, keys]) => (
              <section className="profile-section" key={title}>
                <h3>{title}</h3>
                <div className="form-grid">
                  {keys
                    .map((key) => fields.company.find((f) => f.key === key))
                    .filter((f): f is Field => !!f)
                    .map((f) => (
                      <div key={f.key}>
                        <small>{f.label}</small>
                        <b>{company[f.key] ?? 'Not added'}</b>
                      </div>
                    ))}
                </div>
              </section>
            ))}
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
              <h3>Compliance Configuration</h3>
              <div className="profile-config">
                <div>
                  <b>
                    {
                      new Set(users.map((u) => u.department).filter(Boolean))
                        .size
                    }
                  </b>
                  <small>Departments</small>
                </div>
                <div>
                  <b>{users.filter((u) => u.status === 'Active').length}</b>
                  <small>Active people</small>
                </div>
                <div>
                  <b>
                    {
                      new Set(tasks.map((t) => t.reviewer_id).filter(Boolean))
                        .size
                    }
                  </b>
                  <small>Task reviewers</small>
                </div>
              </div>
              {allowedNav.some(([name]) => name === 'Users & Roles') && (
                <Button variant="outline" onClick={() => go('Users & Roles')}>
                  Manage team
                  <ArrowRight size={14} />
                </Button>
              )}
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
      'Upcoming Deadlines Report',
      'Overdue Compliance Report',
      'Audit Report',
      'Kaizen Report',
      'Corrective Action Report',
      'Licence Expiry Report',
      'Department Performance Report',
      'Responsible Person Performance Report',
      'Document Missing Report',
    ];
    const scopedTasks = filtered(tasks);
    const inMonth = scopedTasks.filter((t) => t.due?.startsWith(reportMonth));
    const monthTitle = new Date(
      reportMonth + '-01T12:00:00',
    ).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const nextDate = new Date(reportMonth + '-01T12:00:00');
    nextDate.setMonth(nextDate.getMonth() + 1);
    const nextMonth =
      nextDate.getFullYear() +
      '-' +
      String(nextDate.getMonth() + 1).padStart(2, '0');
    const monthCompleted = inMonth.filter(
      (t) => t.status === 'Completed',
    ).length;
    const monthOverdue = inMonth.filter(
      (t) => taskStatus(t) === 'Overdue',
    ).length;
    const monthDueSoon = inMonth.filter(
      (t) => taskStatus(t) === 'Due Soon',
    ).length;
    const monthReview = inMonth.filter(
      (t) => t.status === 'Awaiting Approval',
    ).length;
    const performance = (key: string) =>
      Array.from(new Set(scopedTasks.map((t) => t[key] || 'Unassigned'))).map(
        (value) => {
          const assigned = scopedTasks.filter(
            (t) => (t[key] || 'Unassigned') === value,
          );
          return {
            title: key === 'owner_id' ? person(value) : value,
            total: assigned.length,
            completed: assigned.filter((t) => t.status === 'Completed').length,
            overdue: assigned.filter((t) => taskStatus(t) === 'Overdue').length,
          };
        },
      );
    const departmentData = performance('department'),
      personData = performance('owner_id');
    const aggregate = [
      'Department Performance Report',
      'Responsible Person Performance Report',
    ].includes(reportType);
    const rows =
      reportType === 'Department Performance Report'
        ? departmentData
        : reportType === 'Responsible Person Performance Report'
          ? personData
          : reportType === 'Audit Report'
            ? filtered(audits)
            : reportType === 'Kaizen Report'
              ? filtered(kaizens)
              : reportType === 'Corrective Action Report'
                ? filtered(actions)
                : reportType === 'Licence Expiry Report'
                  ? filtered(records.filter((r) => r.kind === 'licence'))
                  : reportType === 'Overdue Compliance Report'
                    ? scopedTasks.filter((t) => taskStatus(t) === 'Overdue')
                    : reportType === 'Upcoming Deadlines Report'
                      ? scopedTasks
                          .filter(
                            (t) => t.status !== 'Completed' && t.due >= today(),
                          )
                          .sort((a, b) => a.due.localeCompare(b.due))
                      : reportType === 'Document Missing Report'
                        ? scopedTasks.filter(
                            (t) => !files.some((f) => f.record_id === t.id),
                          )
                        : reportType === 'Monthly Compliance Report'
                          ? inMonth
                          : scopedTasks;
    const reportSource =
      reportType === 'Audit Report'
        ? audits
        : reportType === 'Kaizen Report'
          ? kaizens
          : reportType === 'Corrective Action Report'
            ? actions
            : reportType === 'Licence Expiry Report'
              ? records.filter((r) => r.kind === 'licence')
              : tasks;
    const performanceRows = (list: Row[]) => (
      <div className="performance-list">
        {list.length ? (
          list.map((d) => (
            <div key={d.title}>
              <div>
                <b>{d.title}</b>
                <small>
                  {d.total} tasks · {d.completed} completed · {d.overdue}{' '}
                  overdue
                </small>
              </div>
              <progress
                aria-label={d.title + ' completion'}
                value={d.completed}
                max={d.total || 1}
              />
            </div>
          ))
        ) : (
          <EmptyState
            title="No performance data"
            description="Assigned tasks will appear here."
          />
        )}
      </div>
    );
    return (
      <>
        {sectionTitle(
          'Reports',
          'Understand your compliance position and share clear, company-branded reports.',
        )}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{monthTitle} Compliance Summary</h2>
              <p>Current status of tasks due in the selected month.</p>
            </div>
            <label className="report-period">
              Reporting month
              <input
                type="month"
                aria-label="Reporting month"
                value={reportMonth}
                onChange={(e) => {
                  if (e.target.value) setReportMonth(e.target.value);
                }}
              />
            </label>
          </div>
          <div className="monthly-summary">
            {[
              [monthCompleted, 'Completed', 'green'],
              [monthDueSoon, 'Due Soon', 'amber'],
              [monthOverdue, 'Overdue', 'red'],
              [monthReview, 'Pending Review', 'blue'],
            ].map(([value, label, tone]) => (
              <div key={label}>
                <b className={String(tone)}>{value}</b>
                <small>{label}</small>
              </div>
            ))}
          </div>
          <div className="report-metrics">
            <div>
              <strong>{inMonth.length}</strong>
              <small>Tasks due this month</small>
            </div>
            <div>
              <strong>
                {inMonth.length
                  ? Math.round((monthCompleted / inMonth.length) * 100)
                  : 0}
                %
              </strong>
              <small>Completion of this month’s tasks</small>
            </div>
            <div>
              <strong>
                {
                  scopedTasks.filter(
                    (t) =>
                      t.status === 'Completed' &&
                      t.verification_date?.startsWith(reportMonth),
                  ).length
                }
              </strong>
              <small>Approvals recorded this month</small>
            </div>
            <div>
              <strong>
                {
                  scopedTasks.filter(
                    (t) =>
                      t.due?.startsWith(nextMonth) && t.status !== 'Completed',
                  ).length
                }
              </strong>
              <small>Upcoming next month</small>
            </div>
            <div>
              <strong>
                {
                  inMonth.filter(
                    (t) =>
                      ['High', 'Critical'].includes(t.priority) &&
                      t.status !== 'Completed',
                  ).length
                }
              </strong>
              <small>Open high / critical priority</small>
            </div>
            <div>
              <strong>
                {
                  inMonth.filter(
                    (t) => !files.some((f) => f.record_id === t.id),
                  ).length
                }
              </strong>
              <small>Tasks without evidence</small>
            </div>
          </div>
        </section>
        <div className="report-layout">
          <aside className="panel">
            {reportNames.map((name) => (
              <button
                className={
                  reportType === name ? 'report-choice active' : 'report-choice'
                }
                onClick={() => {
                  setReportType(name);
                  setSearch('');
                  setStatus('All statuses');
                  setDept('All departments');
                  setOwnerFilter('All people');
                  setFrequencyFilter('All frequencies');
                  setRiskFilter('All priorities');
                  setFrom('');
                  setTo('');
                }}
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
              {exportButtons(
                rows,
                reportType === 'Monthly Compliance Report'
                  ? monthTitle + ' ' + reportType
                  : reportType,
              )}
            </div>
            {toolbar(reportSource)}
            <div className="report-preview">
              <div className="eyebrow">MANAGEMENT OVERVIEW</div>
              <h2>{company.name}</h2>
              <p>
                {reportType}
                {reportType === 'Monthly Compliance Report'
                  ? ' · ' + monthTitle
                  : ''}{' '}
                · Prepared {dateLabel(today())}
              </p>
              <div className="mini-kpis">
                <div>
                  <strong>{rows.length}</strong>
                  <small>Records in report</small>
                </div>
                <div>
                  <strong>
                    {aggregate
                      ? rows.reduce((sum, r) => sum + r.completed, 0)
                      : rows.filter((r) =>
                          ['Completed', 'Closed', 'Verified'].includes(
                            r.status,
                          ),
                        ).length}
                  </strong>
                  <small>Completed / verified</small>
                </div>
              </div>
              {aggregate ? (
                <div className="table-wrap">
                  <table className="performance-table">
                    <thead>
                      <tr>
                        <th>Team / Responsible Person</th>
                        <th>Total</th>
                        <th>Completed</th>
                        <th>Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.title}>
                          <td>{row.title}</td>
                          <td>{row.total}</td>
                          <td>{row.completed}</td>
                          <td>{row.overdue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!rows.length && <EmptyState />}
                </div>
              ) : (
                table(rows.slice(0, 8))
              )}
              {rows.length > 8 && !aggregate && (
                <small>
                  Showing 8 of {rows.length} records. Download the full report
                  using PDF or Excel.
                </small>
              )}
            </div>
            {!company.logo && (
              <p className="note">
                Upload company logo in My Company to personalize these reports.
              </p>
            )}
          </section>
        </div>
        <div className="dashboard-bottom report-insights">
          <section className="panel">
            <h2>Department Performance</h2>
            {performanceRows(departmentData)}
          </section>
          <section className="panel">
            <h2>Responsible Person Performance</h2>
            {performanceRows(personData)}
          </section>
        </div>
        <section className="panel report-insights">
          <div className="panel-heading">
            <h2>Department Workload</h2>
            <small>Completed and open tasks in the current filters</small>
          </div>
          {departmentData.length ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart
                data={departmentData.map((d) => ({
                  ...d,
                  open: d.total - d.completed,
                }))}
              >
                <CartesianGrid vertical={false} stroke="#edf1f6" />
                <XAxis
                  dataKey="title"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  allowDecimals={false}
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  width={26}
                />
                <Tooltip />
                <Bar
                  name="Completed"
                  dataKey="completed"
                  stackId="a"
                  fill="#6888c7"
                  maxBarSize={34}
                />
                <Bar
                  name="Open"
                  dataKey="open"
                  stackId="a"
                  fill="#dfe7f5"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="No department workload"
              description="Assign departments to your tasks to see workload here."
            />
          )}
        </section>
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
    if (view === 'Documents') {
      const selectedFiles = files.filter(
        (f) =>
          (!search || f.name.toLowerCase().includes(search.toLowerCase())) &&
          (categoryFilter === 'All' || f.category === categoryFilter) &&
          (docType === 'All types' ||
            f.name.split('.').pop()?.toLowerCase() === docType) &&
          (docYear === 'All years' || f.created?.startsWith(docYear)) &&
          (ownerFilter === 'All people' || f.uploaded_by === ownerFilter) &&
          (docRecord === 'All compliance' ||
            (docRecord === 'Company documents'
              ? !f.record_id
              : f.record_id === docRecord)),
      );
      return (
        <>
          {sectionTitle(
            'Documents',
            'Keep compliance evidence organized and accessible.',
            <Button
              onClick={() => {
                setModal({ kind: 'upload' });
                setDraft({ category: 'Other' });
              }}
            >
              <Upload />
              Upload Document
            </Button>,
          )}
          <FilterPills
            label="Document categories"
            value={categoryFilter}
            options={['All', ...categories]}
            onChange={setCategoryFilter}
          />
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
              aria-label="Document type"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              <option>All types</option>
              {Array.from(
                new Set(
                  files
                    .map((f) => f.name.split('.').pop()?.toLowerCase())
                    .filter(Boolean),
                ),
              ).map((ext) => (
                <option key={ext} value={ext}>
                  {ext.toUpperCase()}
                </option>
              ))}
            </select>
            <select
              aria-label="Document compliance"
              value={docRecord}
              onChange={(e) => setDocRecord(e.target.value)}
            >
              <option>All compliance</option>
              <option>Company documents</option>
              {records
                .filter((r) => files.some((f) => f.record_id === r.id))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
            </select>
            <select
              aria-label="Document year"
              value={docYear}
              onChange={(e) => setDocYear(e.target.value)}
            >
              <option>All years</option>
              {Array.from(
                new Set(
                  files.map((f) => f.created?.slice(0, 4)).filter(Boolean),
                ),
              )
                .sort((a, b) => b.localeCompare(a))
                .map((year) => (
                  <option key={year}>{year}</option>
                ))}
            </select>
            <select
              aria-label="Uploaded by"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
            >
              <option value="All people">All uploaders</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="result-count">
            {selectedFiles.length}{' '}
            {selectedFiles.length === 1 ? 'document' : 'documents'}
          </div>
          <section className="panel">{documentList(selectedFiles)}</section>
        </>
      );
    }
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
                    setTab(
                      r.kind === 'task'
                        ? 'Approval'
                        : r.kind === 'audit'
                          ? 'Checklist'
                          : 'Verification',
                    );
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
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Tasks</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td data-label="Team member">
                        <div className="person">
                          <Avatar name={u.name} />
                          <b>{u.name}</b>
                        </div>
                      </td>
                      <td data-label="Email">
                        {u.email.endsWith('@demo.invalid')
                          ? 'Demo account'
                          : u.email}
                      </td>
                      <td data-label="Department">{u.department || '—'}</td>
                      <td data-label="Role">{u.role}</td>
                      <td data-label="Assigned tasks">
                        {
                          tasks.filter(
                            (t) =>
                              t.owner_id === u.id && t.status !== 'Completed',
                          ).length
                        }
                      </td>
                      <td data-label="Status">
                        <Badge value={u.status} />
                      </td>
                      <td data-label="Action">
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
              {fields.settings
                .filter((f) => !['reminders', 'licence_alerts'].includes(f.key))
                .map((f) => (
                  <div key={f.key}>
                    <small>{f.label}</small>
                    <b>{settings?.[f.key] || 'Not configured'}</b>
                  </div>
                ))}
            </div>
            <h3>Task Reminder Schedule</h3>
            {reminderOptions('reminders', settings?.reminders, () => {}, true)}
            <h3>Licence Renewal Alerts</h3>
            {reminderOptions(
              'licence_alerts',
              settings?.licence_alerts,
              () => {},
              true,
            )}
            <p className="note">
              Overdue escalation follows the configured employee, manager and
              owner schedule above.
            </p>
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
              <h2>About Compliance Calendar</h2>
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
    const visibleRows = filtered(rows).filter(
      (r) =>
        kind !== 'task' ||
        taskTab === 'All' ||
        (taskTab === 'Today'
          ? r.due === today() && r.status !== 'Completed'
          : taskTab === 'Upcoming'
            ? r.due > today() && r.status !== 'Completed'
            : taskTab === 'Overdue'
              ? taskStatus(r) === 'Overdue'
              : r.status === 'Completed'),
    );
    return (
      <>
        {sectionTitle(
          kind === 'requirement' ? 'Compliance Requirements' : view,
          kind === 'requirement'
            ? 'Manage the requirements applicable to your business.'
            : kind === 'kaizen'
              ? 'Small improvements. Measurable results.'
              : kind === 'audit'
                ? 'Structured assessments, findings and corrective actions.'
                : kind === 'task'
                  ? 'Tasks assigned to you and actions requiring your attention.'
                  : 'Keep responsibilities, evidence and deadlines in one place.',
          <div className="actions">
            {exportButtons(visibleRows, view)}
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
        {kind === 'task' && (
          <div className="task-view-controls">
            <FilterPills
              label="Task views"
              value={taskTab}
              options={['All', 'Today', 'Upcoming', 'Overdue', 'Completed']}
              onChange={setTaskTab}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={ownerFilter === user.id}
                onChange={(e) =>
                  setOwnerFilter(e.target.checked ? user.id : 'All people')
                }
              />
              Assigned to me
            </label>
          </div>
        )}
        {['task', 'requirement'].includes(kind) && (
          <FilterPills
            label="Compliance categories"
            value={categoryFilter}
            options={['All', ...categories]}
            onChange={setCategoryFilter}
          />
        )}
        {toolbar(rows)}
        {kind === 'task' ? (
          (() => {
            const shown = visibleRows;
            return (
              <>
                <div className="result-count">
                  {shown.length} {shown.length === 1 ? 'task' : 'tasks'}
                </div>
                {shown.length ? (
                  <div className="compliance-list">
                    {shown.map((r) => recordCard(r, true))}
                  </div>
                ) : (
                  <section className="panel">
                    <EmptyState
                      title={
                        taskTab === 'Overdue'
                          ? 'No overdue tasks'
                          : 'No tasks in this view'
                      }
                      description="Try another tab or adjust your filters to see more tasks."
                      icon={CheckCircle2}
                    />
                  </section>
                )}
              </>
            );
          })()
        ) : (
          <>
            <div className="result-count">{filtered(rows).length} records</div>
            <section className="panel flush">
              {table(filtered(rows), kind)}
            </section>
          </>
        )}
      </>
    );
  }
  return (
    <div className="app-shell">
      <WorkspaceHeader
        navigation={allowedNav}
        view={view}
        onNavigate={go}
        user={user}
        company={company}
        roles={roles}
        search={globalSearch}
        onSearch={setGlobalSearch}
        busy={busy}
        notifications={records.filter(
          (r) =>
            r.kind === 'notification' &&
            (!r.owner_id || r.owner_id === user.id || isManager),
        )}
        onRead={() =>
          void act(
            { action: 'read-notifications' },
            'Notifications marked as read',
          )
        }
        onNotification={(n) => {
          const row = records.find((r) => r.id === n.parent_id);
          if (row) open(row);
        }}
        onRole={async (role) => {
          try {
            await request({ action: 'demo-role', role }, '/api/auth');
            setSelected(null);
            setView('Dashboard');
            await load();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
        onLogout={async () => {
          await request({ action: 'logout' }, '/api/auth');
          window.location.href = '/login';
        }}
      />
      <div className="app-body">
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
          <footer className="workspace-footer">
            <b>Compliance Calendar · Powered by MCCIA</b>
            <span>{professionalDisclaimer}</span>
          </footer>
        </main>
      </div>
      {toast && (
        <output className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </output>
      )}
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
