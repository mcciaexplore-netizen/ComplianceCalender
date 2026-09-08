'use client';
import { useState } from 'react';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Avatar,
  Brand,
  EmptyState,
  navLabel,
  StatusBadge,
} from '@/components/compliance-ui';
import { dateLabel } from '@/lib/model';
type Row = Record<string, any>;
type Props = {
  navigation: readonly (readonly [string, LucideIcon])[];
  view: string;
  onNavigate: (name: string) => void;
  user: Row;
  company: Row;
  roles: readonly string[];
  onRole: (role: string) => Promise<void>;
  onLogout: () => Promise<void>;
  search: string;
  onSearch: (s: string) => void;
  notifications: Row[];
  onRead: () => void;
  onNotification: (n: Row) => void;
  busy: boolean;
};
export default function WorkspaceHeader({
  navigation,
  view,
  onNavigate,
  user,
  company,
  roles,
  onRole,
  onLogout,
  search,
  onSearch,
  notifications,
  onRead,
  onNotification,
  busy,
}: Props) {
  const [mobile, setMobile] = useState(false),
    [more, setMore] = useState(false),
    [account, setAccount] = useState(false),
    [inbox, setInbox] = useState(false);
  const main = [
    'Dashboard',
    'Compliance Calendar',
    'My Tasks',
    'Requirements',
    'Documents',
    'Reports',
  ];
  const unread = notifications.filter((n) => n.status === 'Unread').length;
  function navigate(name: string) {
    onNavigate(name);
    setMore(false);
    setMobile(false);
    setAccount(false);
  }
  return (
    <header className="family-header">
      <div className="family-header-inner">
        <Brand />
        <nav className="primary-navigation" aria-label="Main navigation">
          {main
            .filter((name) => navigation.some(([n]) => n === name))
            .map((name) => (
              <button
                key={name}
                aria-current={view === name ? 'page' : undefined}
                className={view === name ? 'active' : ''}
                onClick={() => navigate(name)}
              >
                {navLabel(name)}
              </button>
            ))}
          <Popover open={more} onOpenChange={setMore}>
            <PopoverTrigger
              className={!main.includes(view) ? 'nav-more active' : 'nav-more'}
            >
              More
              <ChevronDown size={13} />
            </PopoverTrigger>
            <PopoverContent>
              <PopoverTitle className="menu-heading">
                Workspace tools
              </PopoverTitle>
              <div className="menu-links">
                {navigation
                  .filter(([name]) => !main.includes(name))
                  .map(([name, Icon]) => (
                    <button
                      key={name}
                      onClick={() => navigate(name)}
                      aria-current={view === name ? 'page' : undefined}
                    >
                      <Icon size={16} />
                      {navLabel(name)}
                    </button>
                  ))}
              </div>
            </PopoverContent>
          </Popover>
        </nav>
        <div className="header-actions">
          <Popover open={inbox} onOpenChange={setInbox}>
            <PopoverTrigger
              className="icon-button notification-trigger"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            >
              <Bell size={19} />
              {unread > 0 && (
                <span className="notification-count">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent className="notification-popover">
              <div className="panel-heading">
                <PopoverTitle>Notifications</PopoverTitle>
                <button
                  disabled={busy || !unread}
                  className="text-button"
                  onClick={onRead}
                >
                  Mark all read
                </button>
              </div>
              <PopoverDescription>
                Deadlines, submissions and reviewer decisions.
              </PopoverDescription>
              <div className="notification-feed">
                {notifications.length ? (
                  notifications.map((n) => (
                    <button
                      className={`notification-item ${n.status === 'Unread' ? 'unread' : ''}`}
                      key={n.id}
                      onClick={() => {
                        onNotification(n);
                        setInbox(false);
                      }}
                    >
                      <StatusBadge value={n.status} />
                      <p>{n.title}</p>
                      <small>{dateLabel(n.date)}</small>
                    </button>
                  ))
                ) : (
                  <EmptyState
                    title="You're all caught up"
                    description="Your deadline and approval updates will appear here."
                    icon={Bell}
                  />
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Popover open={account} onOpenChange={setAccount}>
            <PopoverTrigger className="account-trigger">
              <Avatar name={user.name} />
              <span className="account-name">
                <b>{user.name}</b>
                <small>{user.role}</small>
              </span>
              <ChevronDown size={14} />
            </PopoverTrigger>
            <PopoverContent className="account-popover">
              <PopoverTitle>{user.name}</PopoverTitle>
              <PopoverDescription>{company.name}</PopoverDescription>
              {company.demo && (
                <label className="demo-role">
                  Explore a demo role
                  <select
                    aria-label="Demo role"
                    value={user.role}
                    onChange={(e) => {
                      void onRole(e.target.value);
                      setAccount(false);
                    }}
                  >
                    {roles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </label>
              )}
              <div className="menu-links">
                {navigation
                  .filter(([name]) =>
                    [
                      'My Company',
                      'Users & Roles',
                      'Settings',
                      'Help & Support',
                    ].includes(name),
                  )
                  .map(([name, Icon]) => (
                    <button key={name} onClick={() => navigate(name)}>
                      <Icon size={16} />
                      {navLabel(name)}
                    </button>
                  ))}
                <button onClick={() => void onLogout()}>
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            className="mobile-toggle"
            variant="ghost"
            size="icon"
            aria-label={mobile ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobile}
            aria-controls="mobile-navigation"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {mobile && (
        <nav
          id="mobile-navigation"
          className="mobile-navigation"
          aria-label="Mobile navigation"
        >
          {navigation.map(([name, Icon]) => (
            <button
              key={name}
              onClick={() => navigate(name)}
              aria-current={view === name ? 'page' : undefined}
            >
              <Icon size={17} />
              {navLabel(name)}
            </button>
          ))}
        </nav>
      )}
      <div className="workspace-context">
        <div>
          <span className="company-context">{company.name}</span>
          {company.demo && <span className="demo-label">Demo workspace</span>}
        </div>
        <div className="global-search">
          <Search size={15} />
          <input
            aria-label="Global search"
            placeholder="Search your workspace…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
          {search && (
            <button
              aria-label="Clear global search"
              onClick={() => onSearch('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
