'use client';
import { createContext, useContext } from 'react';
import {
  Search,
  ArrowRight,
  AudioLines,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Workspace, Consultation, Source } from '@/lib/copilot/types';
export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const r = await fetch('/api/copilot/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers:
      body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined
      ? {}
      : { body: body instanceof FormData ? body : JSON.stringify(body) }),
  });
  const b = (await r.json()) as T & { error?: string };
  if (!r.ok) {
    if (r.status === 401) window.dispatchEvent(new Event('copilot:expired'));
    throw new Error(b.error || 'Request failed.');
  }
  return b;
}
export interface AppContext {
  data: Workspace;
  refresh: () => Promise<void>;
  notify: (text: string) => void;
  view: (name: string) => void;
  join: (c: Consultation) => Promise<void>;
  openDemo: () => void;
  openSchedule: () => void;
  source: (source: Source) => void;
  theme: string;
  toggleTheme: () => void;
}
export const Context = createContext<AppContext>(null as unknown as AppContext);
export const useApp = () => useContext(Context);
export const initials = (s: string) =>
  s
    .split(' ')
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
export function dateKey(value: string | Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}
export function time(value: string) {
  return new Date(value).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
export function duration(seconds = 0) {
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}
export function Logo() {
  return (
    <a className="cp-brand" href="/copilot">
      <span className="cp-logo">
        <AudioLines size={26} />
      </span>
      <span>
        SME HELPLINE<small>AI COPILOT</small>
      </span>
    </a>
  );
}
export function Waveform() {
  return (
    <div className="cp-hero-visual">
      <span className="cp-orbit-label">
        <AudioLines size={15} /> Listening with you
      </span>
      <div className="cp-audio-bars">
        {Array.from({ length: 31 }, (_, i) => (
          <i
            key={i}
            style={{
              height:
                18 + Math.sin(i * 1.9) ** 2 * 55 + (i > 10 && i < 20 ? 30 : 0),
            }}
          />
        ))}
      </div>
      <span className="cp-orbit-label">
        The insight you need. In the moment.
      </span>
    </div>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={'cp-status ' + status.toLowerCase().replaceAll(' ', '-')}>
      <i />
      {status}
    </span>
  );
}
export function Modal({
  open,
  title,
  description,
  close,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  close: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className={'cp-modal ' + (wide ? 'cp-modal-wide' : '')}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {description || 'Review the details below.'}
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function Empty({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="cp-empty">
      <ShieldCheck size={26} />
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="cp-loading">
      <LoaderCircle size={24} className="cp-spin" />
      <span>Opening your workspace…</span>
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="cp-search">
      <Search size={16} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}
export function ConsultationTable({ items }: { items: Consultation[] }) {
  const { join, data } = useApp();
  return items.length ? (
    <div className="cp-table-wrap">
      <table>
        <thead>
          <tr>
            <th>CLIENT & COMPANY</th>
            <th>TOPIC</th>
            <th>TIME · IST</th>
            <th>STATUS</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((r, i) => (
            <tr key={r.id}>
              <td>
                <div className="cp-client-cell">
                  <span className={'cp-avatar cp-tone-' + (i % 4)}>
                    {initials(r.client)}
                  </span>
                  <span>
                    <b>{r.client}</b>
                    <small>{r.company}</small>
                  </span>
                </div>
              </td>
              <td>
                {r.topic}
                <small>
                  {data.consultants.find((c) => c.id === r.consultant_id)?.name}
                </small>
              </td>
              <td className="cp-nowrap">
                {time(r.start)} – {time(r.end)}
                <small>{dateKey(r.start)}</small>
              </td>
              <td>
                <Badge status={r.status} />
              </td>
              <td>
                <Button
                  variant={
                    ['Waiting', 'Live'].includes(r.status)
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() => join(r)}
                >
                  {r.status === 'Completed'
                    ? 'Review'
                    : r.status === 'Cancelled'
                      ? 'View'
                      : data.user.role === 'Supervisor'
                        ? 'Monitor'
                        : 'Join'}
                  <ArrowRight size={13} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty
      title="A little room in your day"
      detail="Your consultations will appear here when they are scheduled."
    />
  );
}
