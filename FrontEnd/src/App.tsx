import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import AppLayout from './components/layout/AppLayout';
import type { NavKey } from './components/layout/Sidebar';
import AuthProvider from './context/AuthContext';
import { useAuth, useCurrentUser } from './context/useAuth';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import MyReportsPage from './pages/MyReportsPage';
import RegisterPage from './pages/RegisterPage';
import ReportDetailsPage from './pages/ReportDetailsPage';
import SubmitReportPage from './pages/SubmitReportPage';
import TrackReportsPage from './pages/TrackReportsPage';
import type { ReportListPreset } from './pages/TrackReportsPage';
import { getReportStats } from './services/reports.service';
import type { ReportScope } from './types/report.types';

/* ------------------------------------------------------------------ */
/* Navigation model                                                    */
/* ------------------------------------------------------------------ */

/**
 * A list page can be opened with a filter or a search already applied.
 * `instance` changes every time one is opened, so the page remounts and
 * applies the new initial values even when it is already on screen.
 */
interface ListView {
  name: 'feed' | 'mine';
  instance: number;
  preset?: ReportListPreset;
  search?: string;
}

type BackTarget = { name: 'dashboard' } | ListView;

type View =
  | { name: 'dashboard' }
  | { name: 'submit' }
  | ListView
  | { name: 'details'; reportId: string; backTo: BackTarget };

const firstNameOf = (fullName: string): string =>
  fullName.replace(/^(dr|eng|prof)\.?\s+/i, '').split(/\s+/)[0] ?? fullName;

/* ------------------------------------------------------------------ */
/* Screens for signed-out users                                        */
/* ------------------------------------------------------------------ */

function LoadingScreen() {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center bg-[#0f172a] text-slate-300"
    >
      <Loader2 className="animate-spin" size={28} aria-hidden="true" />
      <span className="sr-only">Loading EngiCare</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Signed-in application                                               */
/* ------------------------------------------------------------------ */

interface AuthenticatedAppProps {
  onSignedOut: () => void;
}

function AuthenticatedApp({ onSignedOut }: AuthenticatedAppProps) {
  const user = useCurrentUser();
  const { isAdmin, logout } = useAuth();

  const [view, setView] = useState<View>({ name: 'dashboard' });
  const [openCount, setOpenCount] = useState<number | undefined>(undefined);
  const listInstanceRef = useRef(0);

  /* Open reports = pending + under review + in progress. Shown as a sidebar badge. */
  const refreshCounts = useCallback(async () => {
    try {
      const stats = await getReportStats(user, isAdmin ? 'all' : 'mine');
      setOpenCount(stats.open);
    } catch {
      /* The badge simply keeps its last known value. */
    }
  }, [user, isAdmin]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  const createListView = (
    name: ListView['name'],
    options: Pick<ListView, 'preset' | 'search'> = {},
  ): ListView => {
    listInstanceRef.current += 1;
    return { name, instance: listInstanceRef.current, ...options };
  };

  const navigate = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, left: 0 });
  };

  const handleSidebarNavigate = (key: NavKey) => {
    if (key === 'dashboard') navigate({ name: 'dashboard' });
    else if (key === 'submit') navigate({ name: 'submit' });
    else navigate(createListView(key));
  };

  const openList = (scope: ReportScope, preset?: ReportListPreset) => {
    navigate(createListView(scope === 'mine' ? 'mine' : 'feed', { preset }));
  };

  const openReport = (reportId: string) => {
    /* "Back" returns to the list the user came from, with the same filters. */
    const backTo: BackTarget = view.name === 'feed' || view.name === 'mine' ? view : { name: 'dashboard' };
    navigate({ name: 'details', reportId, backTo });
  };

  const handleLogout = async () => {
    await logout();
    onSignedOut();
  };

  /* ----------------------------- Page chrome ---------------------- */

  let title: string;
  let subtitle: string;

  switch (view.name) {
    case 'dashboard':
      title = isAdmin ? 'Facilities overview' : 'Dashboard';
      subtitle = isAdmin
        ? 'Track and manage every maintenance report in the faculty'
        : `Welcome back, ${firstNameOf(user.fullName)}. Track ongoing maintenance and report new campus issues.`;
      break;
    case 'submit':
      title = 'Report an issue';
      subtitle = 'Report a maintenance or safety issue in the faculty';
      break;
    case 'mine':
      title = 'My reports';
      subtitle = 'Every issue you reported and where it stands';
      break;
    case 'feed':
      title = isAdmin ? 'All reports' : 'Faculty feed';
      subtitle = isAdmin
        ? 'Search, filter and manage every report'
        : 'Issues reported across the faculty. Reporter names are hidden.';
      break;
    default:
      title = 'Report details';
      subtitle = 'Full information, history and discussion of this report';
  }

  const activeItem: NavKey = view.name === 'details' ? view.backTo.name : view.name;

  const badgeCounts: Partial<Record<NavKey, number>> | undefined =
    openCount === undefined ? undefined : isAdmin ? { feed: openCount } : { mine: openCount };

  const renderPage = (): ReactNode => {
    switch (view.name) {
      case 'dashboard':
        return (
          <DashboardPage
            onViewReport={openReport}
            onViewList={openList}
            onNewReport={() => navigate({ name: 'submit' })}
          />
        );

      case 'submit':
        return (
          <SubmitReportPage
            onViewReport={openReport}
            onCancel={() => navigate({ name: 'dashboard' })}
            onSubmitted={() => {
              void refreshCounts();
            }}
          />
        );

      case 'mine':
        return (
          <MyReportsPage
            key={`mine-${view.instance}`}
            initialPreset={view.preset}
            initialSearch={view.search}
            onViewReport={openReport}
            onNewReport={() => navigate({ name: 'submit' })}
          />
        );

      case 'feed':
        return (
          <TrackReportsPage
            key={`feed-${view.instance}`}
            scope="all"
            initialPreset={view.preset}
            initialSearch={view.search}
            onViewReport={openReport}
            onNewReport={() => navigate({ name: 'submit' })}
          />
        );

      case 'details':
        return (
          <ReportDetailsPage
            key={view.reportId}
            reportId={view.reportId}
            backLabel={
              view.backTo.name === 'dashboard'
                ? 'Back to dashboard'
                : view.backTo.name === 'mine'
                  ? 'Back to my reports'
                  : 'Back to reports'
            }
            onBack={() => navigate(view.backTo)}
            onReportChanged={() => {
              void refreshCounts();
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <AppLayout
      activeItem={activeItem}
      onNavigate={handleSidebarNavigate}
      user={user}
      isAdmin={isAdmin}
      onLogout={() => {
        void handleLogout();
      }}
      title={title}
      subtitle={subtitle}
      badgeCounts={badgeCounts}
      onSearch={
        view.name === 'submit' ? undefined : (query) => navigate(createListView('feed', { search: query }))
      }
      onNewReport={
        isAdmin || view.name === 'submit' ? undefined : () => navigate({ name: 'submit' })
      }
    >
      {renderPage()}
    </AppLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

function AppContent() {
  const { status, user } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (status === 'unauthenticated' || user === null) {
    return authView === 'register' ? (
      <RegisterPage onBackToLogin={() => setAuthView('login')} />
    ) : (
      <LoginPage onRegister={() => setAuthView('register')} />
    );
  }

  /* `key` makes sure nothing from a previous user survives a change of account. */
  return <AuthenticatedApp key={user.id} onSignedOut={() => setAuthView('login')} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}