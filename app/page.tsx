'use client';
import { ArrowRight, CalendarDays, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AccessLayout from '@/components/access-layout';
export default function Home() {
  return (
    <AccessLayout>
      <div className="eyebrow">MCCIA DIGITAL WORKSPACE</div>
      <h2>
        Every deadline.
        <br />
        One clear view.
      </h2>
      <p>
        Keep your team’s compliance tasks, submissions and approvals moving.
        Your next action is always in view.
      </p>
      <div className="access-demo-summary">
        <CalendarDays size={24} />
        <div>
          <b>Your compliance workspace</b>
          <small>Calendar · Tasks · Evidence · Approvals · Reports</small>
        </div>
      </div>
      <div className="access-actions">
        <Button render={<a href="/login" aria-label="Sign in" />}>
          Sign In
          <ArrowRight size={16} />
        </Button>
        <Button
          variant="outline"
          render={<a href="/workspace?demo=1" aria-label="Explore demo" />}
        >
          Explore Demo
        </Button>
      </div>
      <div className="access-register">
        New to Compliance Calendar?{' '}
        <a href="/register">
          Create a company account
          <ArrowRight size={14} />
        </a>
      </div>
      <div className="access-demo-note">
        <ShieldCheck size={16} />
        <span>
          Explore sample records and all seven roles in a separate demo
          workspace.
        </span>
      </div>
    </AccessLayout>
  );
}
