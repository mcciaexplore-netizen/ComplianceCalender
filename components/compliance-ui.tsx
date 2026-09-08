'use client';
import { useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  FileCheck2,
  FolderOpen,
  TriangleAlert,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const professionalDisclaimer =
  'This platform is a compliance management and tracking tool. It does not constitute legal, tax, accounting or professional advice. Applicability and filing requirements should be verified with the appropriate qualified professional or authority.';
export const navLabel = (name: string) =>
  ({
    'Compliance Calendar': 'Calendar',
    Requirements: 'Compliance',
    'My Company': 'Company Profile',
  })[name] || name;
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <a
      className={`product-brand ${light ? 'brand-light' : ''}`}
      href="/"
      aria-label="MCCIA Compliance Calendar home"
    >
      <span className="parent-brand">
        <img src="/assets/mccia-logo.png" alt="MCCIA" width="96" height="34" />
      </span>
      <span className="product-wordmark">
        <strong>Compliance Calendar</strong>
        <small>
          Compliance Management <span>· Powered by MCCIA</span>
        </small>
      </span>
    </a>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {name
        .split(' ')
        .filter(Boolean)
        .map((s) => s[0])
        .slice(0, 2)
        .join('')}
    </span>
  );
}
export function statusTone(value: string) {
  if (
    ['Completed', 'Verified', 'Closed', 'Compliant', 'Active'].includes(value)
  )
    return 'green';
  if (
    [
      'Overdue',
      'Returned',
      'Non-Compliant',
      'Critical',
      'Rejected',
      'Correction Required',
      'High',
    ].includes(value)
  )
    return 'red';
  if (
    [
      'Awaiting Approval',
      'Pending Review',
      'Submitted',
      'Under Review',
      'In Progress',
      'Pending Verification',
      'Unread',
    ].includes(value)
  )
    return 'blue';
  if (
    [
      'Due Soon',
      'Needs Review',
      'Partially Compliant',
      'Renewal Due',
      'Medium',
    ].includes(value)
  )
    return 'amber';
  return 'grey';
}
export function StatusBadge({ value = 'Not Started' }: { value?: string }) {
  const tone = statusTone(value);
  const Icon =
    tone === 'green'
      ? CheckCircle2
      : tone === 'red'
        ? TriangleAlert
        : tone === 'amber'
          ? Clock
          : tone === 'blue'
            ? FileCheck2
            : Circle;
  return (
    <span className={`badge ${tone}`}>
      <Icon size={12} aria-hidden="true" />
      {value === 'Awaiting Approval'
        ? 'Pending Review'
        : value === 'Returned'
          ? 'Correction Required'
          : value}
    </span>
  );
}
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="page-heading-actions">{action}</div>}
    </div>
  );
}
export function KpiCard({
  label,
  value,
  note,
  icon: Icon,
  tone = 'blue',
  onClick,
}: {
  label: string;
  value: number | string;
  note: string;
  icon: LucideIcon;
  tone?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="kpi-label">
        {label}
        <span className={`kpi-icon ${tone}`}>
          <Icon size={19} />
        </span>
      </span>
      <strong>{value}</strong>
      <small>{note}</small>
    </>
  );
  return onClick ? (
    <button className="kpi" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="kpi">{content}</div>
  );
}
export function FilterPills({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="filter-pills" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          aria-pressed={value === option}
          className={value === option ? 'active' : ''}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </fieldset>
  );
}
export function EmptyState({
  title = 'No matching records',
  description = 'Try adjusting your filters or add your first record.',
  icon: Icon = FolderOpen,
  action,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={23} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function ComplianceCard({
  title,
  authority,
  frequency,
  category,
  due,
  dueLabel,
  owner,
  status,
  priority,
  detail,
  onOpen,
  onEvidence,
}: {
  title: string;
  authority?: string;
  frequency?: string;
  category?: string;
  due?: string;
  dueLabel: string;
  owner: string;
  status: string;
  priority?: string;
  detail?: string;
  onOpen: () => void;
  onEvidence?: () => void;
}) {
  const days = due
    ? Math.round(
        (Date.parse(`${due.slice(0, 10)}T00:00:00Z`) -
          Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)) /
          86400000,
      )
    : null;
  const remaining = [
    'Completed',
    'Closed',
    'Verified',
    'Not Applicable',
  ].includes(status)
    ? status
    : days === null || !Number.isFinite(days)
      ? 'No due date'
      : days === 0
        ? 'Due today'
        : days < 0
          ? `${Math.abs(days)} ${days === -1 ? 'day' : 'days'} past due`
          : `${days} ${days === 1 ? 'day' : 'days'} left`;
  return (
    <article className={`compliance-card edge-${statusTone(status)}`}>
      <div className="compliance-identity">
        <span className="category-caption">
          {category || 'Compliance'}
          {frequency ? ` · ${frequency}` : ''}
        </span>
        <button className="record-link" onClick={onOpen}>
          {title}
        </button>
        <small>{authority || 'Authority not specified'}</small>
        {detail && <small>{detail}</small>}
      </div>
      <div className="compliance-date">
        <small>Due date</small>
        <b>
          <CalendarDays size={14} />
          {dueLabel}
        </b>
        <span className={statusTone(status)}>{remaining}</span>
      </div>
      <div className="compliance-owner">
        <small>Responsible</small>
        <div className="person">
          <Avatar name={owner} />
          <span>{owner}</span>
        </div>
      </div>
      <div className="compliance-status">
        <StatusBadge value={status} />
        {priority && (
          <span className={`priority-label ${statusTone(priority)}`}>
            {priority} priority
          </span>
        )}
      </div>
      <div className="compliance-actions">
        <Button variant="outline" size="sm" onClick={onOpen}>
          View details <ArrowRight size={14} />
        </Button>
        {onEvidence && (
          <button className="text-button" onClick={onEvidence}>
            <Upload size={13} />
            Upload evidence
          </button>
        )}
      </div>
    </article>
  );
}
export function FileUpload({
  busy,
  onUpload,
  title = 'Filing Evidence',
  description = 'Upload acknowledgement, challan, return copy or supporting documents.',
}: {
  busy: boolean;
  onUpload: (file: File) => Promise<unknown>;
  title?: string;
  description?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  async function take(file?: File) {
    if (!file || busy) return;
    if (!/\.(pdf|png|jpe?g|xlsx|docx|csv|txt)$/i.test(file.name)) {
      setError('Choose a PDF, Excel, Word, image, CSV or text file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Choose a file smaller than 10 MB.');
      return;
    }
    setError('');
    await onUpload(file);
  }
  return (
    <div className="file-upload">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        aria-busy={busy}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node))
            setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length > 1) {
            setError('Please upload one document at a time.');
            return;
          }
          void take(e.dataTransfer.files[0]);
        }}
      >
        <span className="upload-icon">
          <Upload size={21} />
        </span>
        <div>
          <b>
            {busy ? 'Uploading document…' : 'Drop a file here, or browse files'}
          </b>
          <small>PDF, Excel, Word, images, CSV or text · Up to 10 MB</small>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          Browse files
        </Button>
        <input
          ref={input}
          className="sr-only"
          aria-label={title}
          type="file"
          disabled={busy}
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.docx,.csv,.txt"
          onChange={(e) => {
            void take(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
