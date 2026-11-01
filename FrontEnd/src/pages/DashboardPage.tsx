import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CircleCheck,
  Clock,
  FilePlus,
  Files,
  Inbox,
  RefreshCw,
  Search,
  TriangleAlert,
  Wrench,
} from 'lucide-react';

import Button from '../components/ui/Button';
import ReportCard, { ReportCardSkeleton } from '../components/ui/ReportCard';
import StatCard from '../components/ui/StatCard';
import { useAuth, useCurrentUser } from '../context/useAuth';
import { getRecentReports, getReportStats, toServiceError } from '../services/reports.service';
import type { Report, ReportScope, ReportStats } from '../types/report.types';
import type { ReportListPreset } from './TrackReportsPage';

export interface DashboardPageProps {
  onViewReport: (reportId: string) => void;
  /** Opens a list page ("mine" or "all") with an optional filter already applied. */
  onViewList: (scope: ReportScope, preset?: ReportListPreset) => void;
  onNewReport: () => void;
}

const formatAverage = (hours: number | null): string | undefined => {
  if (hours === null) return undefined;
  if (hours < 1) return `Avg. ${Math.max(1, Math.round(hours * 60))} min per report`;
  if (hours < 48) return `Avg. ${Math.round(hours * 10) / 10} h per report`;
  return `Avg. ${Math.round((hours / 24) * 10) / 10} days per report`;
};

export default function DashboardPage({ onViewReport, onViewList, onNewReport }: DashboardPageProps) {
  const user = useCurrentUser();
  const { isAdmin } = useAuth();
  const scope: ReportScope = isAdmin ? 'all' : 'mine';
  const recentLimit = isAdmin ? 6 : 3;

  const [stats, setStats] = useState<ReportStats | null>(null);
  const [recent, setRecent] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const [loadedStats, loadedRecent] = await Promise.all([
          getReportStats(user, scope),
          getRecentReports(user, recentLimit, scope),
        ]);
        if (isCancelled) return;

        setStats(loadedStats);
        setRecent(loadedRecent);
        setErrorMessage(null);
      } catch (error) {
        if (isCancelled) return;
        setErrorMessage(toServiceError(error).message);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [user, scope, recentLimit, reloadKey]);

  const handleRetry = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setReloadKey((key) => key + 1);
  };

  if (errorMessage !== null) {
    return (
      <div
        role="alert"
        className="mx-auto flex max-w-md flex-col items-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fee2e2]">
          <TriangleAlert className="text-[#dc2626]" size={24} aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Couldn’t load the dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">{errorMessage}</p>
        <Button
          className="mt-5"
          variant="outline"
          onClick={handleRetry}
          leftIcon={<RefreshCw size={16} aria-hidden="true" />}
        >
          Try again
        </Button>
      </div>
    );
  }

  const urgentCount = stats?.urgent ?? 0;
  const showUrgentBanner = isAdmin && !isLoading && urgentCount > 0;
  const hasRecent = recent.length > 0;

  return (
    <div className="space-y-6">
      {showUrgentBanner && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-[#dc2626]/30 bg-[#fee2e2] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 shrink-0 text-[#dc2626]" size={20} aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-[#991b1b]">
                {urgentCount} urgent {urgentCount === 1 ? 'report is' : 'reports are'} still open
              </p>
              <p className="text-sm text-[#991b1b]">
                Urgent issues affect safety or block teaching and need fast action.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            className="shrink-0"
            onClick={() => onViewList('all', { priority: 'urgent' })}
          >
            View urgent reports
          </Button>
        </div>
      )}

      <section aria-labelledby="dashboard-stats-heading">
        <h2 id="dashboard-stats-heading" className="sr-only">
          Report statistics
        </h2>

        {isAdmin ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total reports"
              value={stats?.total ?? null}
              icon={Files}
              tone="neutral"
              description="All time"
              isLoading={isLoading}
              onClick={() => onViewList('all')}
            />
            <StatCard
              label="Pending"
              value={stats?.pending ?? null}
              icon={Clock}
              tone="pending"
              description="Waiting for review"
              isLoading={isLoading}
              onClick={() => onViewList('all', { status: 'pending' })}
            />
            <StatCard
              label="Under review"
              value={stats?.underReview ?? null}
              icon={Search}
              tone="neutral"
              description="Being checked"
              isLoading={isLoading}
              onClick={() => onViewList('all', { status: 'under_review' })}
            />
            <StatCard
              label="In progress"
              value={stats?.inProgress ?? null}
              icon={Wrench}
              tone="in_progress"
              description="Being worked on"
              isLoading={isLoading}
              onClick={() => onViewList('all', { status: 'in_progress' })}
            />
            <StatCard
              label="Resolved"
              value={stats?.resolved ?? null}
              icon={CircleCheck}
              tone="resolved"
              description={formatAverage(stats?.averageResolutionHours ?? null) ?? 'Fixed and closed'}
              isLoading={isLoading}
              onClick={() => onViewList('all', { status: 'resolved' })}
            />
            <StatCard
              label="Urgent"
              value={stats?.urgent ?? null}
              icon={TriangleAlert}
              tone="urgent"
              description="Still open"
              isLoading={isLoading}
              onClick={() => onViewList('all', { priority: 'urgent' })}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total reported issues"
              value={stats?.total ?? null}
              icon={Files}
              tone="neutral"
              isLoading={isLoading}
              onClick={() => onViewList('mine')}
            />
            <StatCard
              label="Active / in progress"
              value={stats?.open ?? null}
              icon={Clock}
              tone="pending"
              isLoading={isLoading}
              onClick={() => onViewList('mine')}
            />
            <StatCard
              label="Resolved issues"
              value={stats?.resolved ?? null}
              icon={CircleCheck}
              tone="resolved"
              isLoading={isLoading}
              onClick={() => onViewList('mine', { status: 'resolved' })}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="dashboard-recent-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="dashboard-recent-heading" className="text-lg font-semibold text-slate-900">
            {isAdmin ? 'Latest reports' : 'My latest reports'}
          </h2>
          {hasRecent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewList(scope)}
              rightIcon={<ArrowRight size={14} aria-hidden="true" />}
            >
              View all
            </Button>
          )}
        </div>

        {isLoading ? (
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            role="status"
            aria-label="Loading reports"
          >
            {Array.from({ length: recentLimit }, (_, index) => (
              <ReportCardSkeleton key={index} />
            ))}
          </div>
        ) : hasRecent ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recent.map((report) => (
              <ReportCard key={report.id} report={report} onView={onViewReport} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Inbox className="text-slate-500" size={24} aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              {isAdmin ? 'No reports yet' : 'You haven’t reported anything yet'}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-600">
              {isAdmin
                ? 'When someone reports an issue in the faculty, it will show up here.'
                : 'Found a broken projector, a leak or a Wi-Fi problem? Report it and follow its progress here.'}
            </p>
            {!isAdmin && (
              <Button
                className="mt-5"
                onClick={onNewReport}
                leftIcon={<FilePlus size={16} aria-hidden="true" />}
              >
                Report an issue
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}