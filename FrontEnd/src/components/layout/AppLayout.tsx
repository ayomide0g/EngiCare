import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';

import type { ReportUser } from '../../types/report.types';
import Header from './Header';
import Sidebar from './Sidebar';
import type { NavKey } from './Sidebar';

export interface AppLayoutProps {
  activeItem: NavKey;
  onNavigate: (key: NavKey) => void;
  user: Pick<ReportUser, 'fullName' | 'role'>;
  isAdmin: boolean;
  onLogout: () => void;
  title: string;
  subtitle?: string;
  badgeCounts?: Partial<Record<NavKey, number>>;
  /** Called with the query when the header search is submitted. Hides the search field when omitted. */
  onSearch?: (query: string) => void;
  /** Called when "New report" is pressed. Hides the button when omitted. */
  onNewReport?: () => void;
  children: ReactNode;
}

/** Matches Tailwind's `lg` breakpoint, where the sidebar becomes permanent. */
const DESKTOP_QUERY = '(min-width: 1024px)';

export default function AppLayout({
  activeItem,
  onNavigate,
  user,
  isAdmin,
  onLogout,
  title,
  subtitle,
  badgeCounts,
  onSearch,
  onNewReport,
  children,
}: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [title]);

  useEffect(() => {
    if (!isSidebarOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_QUERY);

    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsSidebarOpen(false);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleSkipLink = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    mainRef.current?.focus();
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900">
      <a
        href="#main-content"
        onClick={handleSkipLink}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[#0f172a] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-2 focus:outline-offset-2 focus:outline-[#2563eb]"
      >
        Skip to main content
      </a>

      <Sidebar
        activeItem={activeItem}
        onNavigate={onNavigate}
        user={user}
        isAdmin={isAdmin}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        badgeCounts={badgeCounts}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={title}
          subtitle={subtitle}
          onMenuClick={openSidebar}
          onSearch={onSearch}
          onNewReport={onNewReport}
        />

        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}