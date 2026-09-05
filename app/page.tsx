'use client';
import {
  ShieldCheck,
  CalendarDays,
  ClipboardCheck,
  Building2,
  FolderOpen,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function Home() {
  return (
    <div className="landing">
      <header>
        <img src="/assets/mccia-logo.png" alt="MCCIA" />
        <div>
          <b>COMPLIANCE MITRA</b>
          <small>MSME Compliance & Audit Management</small>
        </div>
        <span className="spacer" />
        <a href="/login">Login</a>
        <Button render={<a href="/register" aria-label="Register" />}>
          Get started <ArrowRight />
        </Button>
      </header>
      <main>
        <div className="eyebrow">AN MCCIA DIGITAL INITIATIVE</div>
        <h1>
          Every obligation.
          <br />
          One clear view.
        </h1>
        <p className="lead">Stay on top of every compliance obligation.</p>
        <p>
          Manage tasks, audits, licences, documents and approvals
          <br />
          from one centralized workspace built for MSMEs.
        </p>
        <div className="actions">
          <Button render={<a href="/register" aria-label="Register" />}>
            Create your workspace <ArrowRight />
          </Button>
          <Button
            variant="outline"
            render={<a href="/workspace" aria-label="Explore workspace" />}
          >
            Explore demo workspace
          </Button>
        </div>
        <div className="journey">
          Company profile <ArrowRight /> Verified checklist <ArrowRight />{' '}
          Calendar & tasks <ArrowRight /> Audits & reports
        </div>
        <section className="features">
          {[
            [
              CalendarDays,
              'Compliance calendar',
              'A clear view of every upcoming obligation.',
            ],
            [
              ClipboardCheck,
              'Tasks & approvals',
              'Know who owns the work and who reviews it.',
            ],
            [
              ShieldCheck,
              'Compliance audits',
              'Turn observations into verified corrective actions.',
            ],
            [
              Building2,
              'Kaizen improvements',
              'Capture ideas. Measure the improvement.',
            ],
            [
              FolderOpen,
              'Document repository',
              'Keep supporting evidence close to the work.',
            ],
            [
              BarChart3,
              'Company-branded reports',
              'Bring your compliance position into focus.',
            ],
          ].map(([Icon, title, desc]: any) => (
            <article key={title}>
              <Icon />
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </section>
        <footer>
          Compliance tracking and internal assessments. Consult your CA/CS or
          authorized expert for applicability verification.{' '}
          <a href="https://www.mcciapune.com/">MCCIA</a>
        </footer>
      </main>
    </div>
  );
}
