import { useEffect } from 'react';
import {
  Building2,
  ClipboardList,
  FilePlus,
  LayoutDashboard,
  LogOut,
  Newspaper,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { USER_ROLE_LABELS } from '../../types/auth.types';
import type { ReportUser } from '../../types/report.types';

/** Pages reachable from the sidebar. App.tsx uses the same keys for navigation. */
export type NavKey = 'dashboard' | 'submit' | 'mine' | 'feed';

export interface SidebarProps {
  activeItem: NavKey;
  onNavigate: (key: NavKey) => void;
  user: Pick<ReportUser, 'fullName' | 'role'>;
  /** Facilities managers see "All reports" instead of the student items. */
  isAdmin: boolean;
  onLogout: () => void;
  /** Mobile drawer state. Ignored on large screens, where the sidebar is always visible. */
  isOpen: boolean;
  onClose: () => void;
  /** Numbers shown as small badges next to a nav item. Hidden when 0 or missing. */
  badgeCounts?: Partial<Record<NavKey, number>>;
}

interface NavItemConfig {
  key: NavKey;
  label: string;
  /** Label used for facilities managers, when different. */
  adminLabel?: string;
  icon: LucideIcon;
  audience: 'all' | 'user';
}

const NAV_ITEMS: readonly NavItemConfig[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, audience: 'all' },
  { key: 'submit', label: 'Report issue', icon: FilePlus, audience: 'user' },
  { key: 'mine', label: 'My reports', icon: ClipboardList, audience: 'user' },
  {
    key: 'feed',
    label: 'Faculty feed',
    adminLabel: 'All reports',
    icon: Newspaper,
    audience: 'all',
  },
];

const getInitials = (fullName: string): string => {
  const parts = fullName
    .replace(/^(dr|eng|prof)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export default function Sidebar({
  activeItem,
  onNavigate,
  user,
  isAdmin,
  onLogout,
  isOpen,
  onClose,
  badgeCounts,
}: SidebarProps) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleNavigate = (key: NavKey) => {
    onNavigate(key);
    onClose();
  };

  const visibleItems = NAV_ITEMS.filter((item) => item.audience === 'all' || !isAdmin);

  const asideClasses = [
    'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0f172a]',
    'transition-[transform,visibility] duration-200 ease-out',
    'lg:visible lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:shrink-0 lg:translate-x-0',
    isOpen ? 'visible translate-x-0' : 'invisible -translate-x-full',
  ].join(' ');

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0f172a]/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={asideClasses} aria-label="Sidebar">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#1e293b] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563eb]">
              <Building2 className="text-white" size={20} aria-hidden="true" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-semibold text-white">EngiCare</p>
              <p className="text-xs text-slate-400">Faculty Issue Tracker</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#1e293b] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] lg:hidden"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-slate-400">
            Menu
          </p>
          <ul className="space-y-1">
            {visibleItems.map(({ key, label, adminLabel, icon: Icon }) => {
              const isActive = key === activeItem;
              const count = badgeCounts?.[key];
              const showBadge = typeof count === 'number' && count > 0;

              const itemClasses = [
                'relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]',
                isActive
                  ? 'bg-[#1e293b] text-white'
                  : 'text-slate-300 hover:bg-[#1e293b]/60 hover:text-white',
              ].join(' ');

              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => handleNavigate(key)}
                    aria-current={isActive ? 'page' : undefined}
                    className={itemClasses}
                  >
                    {isActive && (
                      <span
                        className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#2563eb]"
                        aria-hidden="true"
                      />
                    )}
                    <Icon
                      className={isActive ? 'text-[#60a5fa]' : 'text-slate-400'}
                      size={18}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{isAdmin && adminLabel ? adminLabel : label}</span>
                    {showBadge && (
                      <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-xs font-semibold text-[#92400e]">
                        {count}
                        <span className="sr-only"> open reports</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-[#1e293b] p-4">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#334155] text-sm font-semibold text-white"
              aria-hidden="true"
            >
              {getInitials(user.fullName)}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-white">{user.fullName}</p>
              <p className="truncate text-xs text-slate-400">{USER_ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-[#1e293b]/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
          >
            <LogOut className="text-slate-400" size={18} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}