import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FilePlus,
  FilterX,
  Inbox,
  RefreshCw,
  Search,
  SearchX,
  TriangleAlert,
} from 'lucide-react';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ReportCard, { ReportCardSkeleton } from '../components/ui/ReportCard';
import Select from '../components/ui/Select';
import type { SelectOption } from '../components/ui/Select';
import { useCurrentUser } from '../context/useAuth';
import { getReports, toServiceError } from '../services/reports.service';
import type {
  BuildingId,
  PaginatedResponse,
  Report,
  ReportCategory,
  ReportFilters,
  ReportPriority,
  ReportScope,
  ReportSortField,
  ReportStatus,
  SortDirection,
} from '../types/report.types';
import {
  BUILDING_IDS,
  BUILDING_LABELS,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  REPORT_CATEGORIES,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  STATUS_LABELS,
  isBuildingId,
  isReportCategory,
  isReportPriority,
  isReportStatus,
} from '../types/report.types';

/** Filter a page can be opened with (for example from a dashboard card). */
export interface ReportListPreset {
  status?: ReportStatus;
  priority?: ReportPriority;
}

export interface TrackReportsPageProps {
  /** "all" is the faculty feed, "mine" is the signed-in user's own reports. */
  scope: ReportScope;
  onViewReport: (reportId: string) => void;
  onNewReport: () => void;
  /** Read once on mount: the parent changes the page `key` to re-apply it. */
  initialPreset?: ReportListPreset;
  /** Search text applied when the page first opens (e.g. from the header search). */
  initialSearch?: string;
}

const PAGE_SIZE = 9;
const SEARCH_DEBOUNCE_MS = 300;

type StatusFilter = ReportStatus | 'all';
type PriorityFilter = ReportPriority | 'all';
type CategoryFilter = ReportCategory | 'all';
type BuildingFilter = BuildingId | 'all';

interface SortOption extends SelectOption {
  sortBy: ReportSortField;
  sortDirection: SortDirection;
}

const SORT_OPTIONS: readonly SortOption[] = [
  { value: 'newest', label: 'Newest first', sortBy: 'createdAt', sortDirection: 'desc' },
  { value: 'oldest', label: 'Oldest first', sortBy: 'createdAt', sortDirection: 'asc' },
  { value: 'updated', label: 'Recently updated', sortBy: 'updatedAt', sortDirection: 'desc' },
  { value: 'priority-high', label: 'Priority: high to low', sortBy: 'priority', sortDirection: 'desc' },
  { value: 'priority-low', label: 'Priority: low to high', sortBy: 'priority', sortDirection: 'asc' },
  { value: 'status', label: 'Status: pending first', sortBy: 'status', sortDirection: 'asc' },
];

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All statuses' },
  ...REPORT_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
];

const PRIORITY_FILTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All priorities' },
  ...REPORT_PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] })),
];

const CATEGORY_FILTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All categories' },
  ...REPORT_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
];

const BUILDING_FILTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All buildings' },
  ...BUILDING_IDS.map((value) => ({ value, label: BUILDING_LABELS[value] })),
];

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]';

type PageItem = number | 'gap-left' | 'gap-right';

const getPageItems = (page: number, totalPages: number): PageItem[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const left = Math.max(2, page - 1);
  const right = Math.min(totalPages - 1, page + 1);
  const items: PageItem[] = [1];

  if (left > 2) items.push('gap-left');
  for (let value = left; value <= right; value += 1) items.push(value);
  if (right < totalPages - 1) items.push('gap-right');
  items.push(totalPages);

  return items;
};

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isDisabled: boolean;
}

function Pagination({ page, totalPages, onPageChange, isDisabled }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1 || isDisabled}
        onClick={() => onPageChange(page - 1)}
        leftIcon={<ChevronLeft size={14} aria-hidden="true" />}
      >
        Previous
      </Button>

      <p className="text-sm text-slate-600 sm:hidden">
        Page {page} of {totalPages}
      </p>

      <ul className="hidden items-center gap-1 sm:flex">
        {getPageItems(page, totalPages).map((item) =>
          typeof item === 'number' ? (
            <li key={item}>
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={[
                  'h-8 min-w-8 rounded-lg px-2 text-sm font-medium transition-colors disabled:cursor-not-allowed',
                  FOCUS_RING,
                  item === page ? 'bg-[#0f172a] text-white' : 'text-slate-700 hover:bg-slate-100',
                ].join(' ')}
              >
                {item}
              </button>
            </li>
          ) : (
            <li key={item} aria-hidden="true" className="px-1 text-slate-500">
              …
            </li>
          ),
        )}
      </ul>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages || isDisabled}
        onClick={() => onPageChange(page + 1)}
        rightIcon={<ChevronRight size={14} aria-hidden="true" />}
      >
        Next
      </Button>
    </nav>
  );
}

interface LoadedResponse {
  key: string;
  data: PaginatedResponse<Report>;
}

interface LoadFailure {
  key: string;
  message: string;
}

export default function TrackReportsPage({
  scope,
  onViewReport,
  onNewReport,
  initialPreset,
  initialSearch,
}: TrackReportsPageProps) {
  const user = useCurrentUser();
  const resultsRef = useRef<HTMLElement>(null);

  const [searchInput, setSearchInput] = useState(initialSearch ?? '');
  const [search, setSearch] = useState((initialSearch ?? '').trim());
  const [status, setStatus] = useState<StatusFilter>(initialPreset?.status ?? 'all');
  const [priority, setPriority] = useState<PriorityFilter>(initialPreset?.priority ?? 'all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [buildingId, setBuildingId] = useState<BuildingFilter>('all');
  const [sortValue, setSortValue] = useState<string>(SORT_OPTIONS[0].value);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [response, setResponse] = useState<LoadedResponse | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);

  /* Apply the typed search after a short pause, so each keystroke does not hit the service. */
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === search) return undefined;

    const timer = window.setTimeout(() => {
      setSearch(trimmed);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  const sortOption = SORT_OPTIONS.find((option) => option.value === sortValue) ?? SORT_OPTIONS[0];

  const filters = useMemo<ReportFilters>(
    () => ({
      scope,
      search,
      status,
      priority,
      category,
      buildingId,
      sortBy: sortOption.sortBy,
      sortDirection: sortOption.sortDirection,
      page,
      pageSize: PAGE_SIZE,
    }),
    [scope, search, status, priority, category, buildingId, sortOption, page],
  );

  const requestKey = `${reloadKey}|${JSON.stringify(filters)}`;

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const data = await getReports(user, filters);
        if (isCancelled) return;
        setResponse({ key: requestKey, data });
        setFailure(null);
      } catch (error) {
        if (isCancelled) return;
        setFailure({ key: requestKey, message: toServiceError(error).message });
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [user, filters, requestKey]);

  const hasError = failure !== null && failure.key === requestKey;
  const isPending = !hasError && (response === null || response.key !== requestKey);
  const isInitialLoading = isPending && response === null;
  const isRefreshing = isPending && response !== null;
  const data = response?.data ?? null;
  const items = data?.items ?? [];
  const showSkeleton = isInitialLoading || (isRefreshing && items.length === 0);

  const hasActiveFilters =
    searchInput.trim() !== '' ||
    status !== 'all' ||
    priority !== 'all' ||
    category !== 'all' ||
    buildingId !== 'all';

  const isMine = scope === 'mine';
  const heading = isMine ? 'My reports' : 'Faculty feed';

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setStatus(isReportStatus(value) ? value : 'all');
    setPage(1);
  };

  const handlePriorityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setPriority(isReportPriority(value) ? value : 'all');
    setPage(1);
  };

  const handleCategoryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setCategory(isReportCategory(value) ? value : 'all');
    setPage(1);
  };

  const handleBuildingChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setBuildingId(isBuildingId(value) ? value : 'all');
    setPage(1);
  };

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSortValue(event.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('all');
    setPriority('all');
    setCategory('all');
    setBuildingId('all');
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    resultsRef.current?.scrollIntoView({ block: 'start' });
  };

  let summary = '';
  if (isInitialLoading) {
    summary = 'Loading…';
  } else if (data && !hasError) {
    if (data.total === 0) {
      summary = '0 reports';
    } else {
      const start = (data.page - 1) * data.pageSize + 1;
      const end = Math.min(data.page * data.pageSize, data.total);
      summary = `Showing ${start}–${end} of ${data.total}${isRefreshing ? ' · Updating…' : ''}`;
    }
  }

  let body;
  if (hasError) {
    body = (
      <div
        role="alert"
        className="flex flex-col items-center rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fee2e2]">
          <TriangleAlert className="text-[#dc2626]" size={24} aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">Couldn’t load reports</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-600">{failure?.message}</p>
        <Button
          className="mt-5"
          variant="outline"
          onClick={() => setReloadKey((key) => key + 1)}
          leftIcon={<RefreshCw size={16} aria-hidden="true" />}
        >
          Try again
        </Button>
      </div>
    );
  } else if (showSkeleton) {
    body = (
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        role="status"
        aria-label="Loading reports"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <ReportCardSkeleton key={index} />
        ))}
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          {hasActiveFilters ? (
            <SearchX className="text-slate-500" size={24} aria-hidden="true" />
          ) : (
            <Inbox className="text-slate-500" size={24} aria-hidden="true" />
          )}
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          {hasActiveFilters
            ? 'No reports match your filters'
            : isMine
              ? 'You haven’t reported anything yet'
              : 'No reports yet'}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-slate-600">
          {hasActiveFilters
            ? 'Try a different search term or remove some filters.'
            : isMine
              ? 'Reports you submit will show up here so you can follow their progress.'
              : 'When someone reports an issue in the faculty, it will show up here.'}
        </p>
        {hasActiveFilters ? (
          <Button
            className="mt-5"
            variant="outline"
            onClick={clearFilters}
            leftIcon={<FilterX size={16} aria-hidden="true" />}
          >
            Clear filters
          </Button>
        ) : (
          <Button
            className="mt-5"
            onClick={onNewReport}
            leftIcon={<FilePlus size={16} aria-hidden="true" />}
          >
            Report an issue
          </Button>
        )}
      </div>
    );
  } else {
    body = (
      <div className={`space-y-4 ${isRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((report) => (
            <ReportCard key={report.id} report={report} onView={onViewReport} />
          ))}
        </div>
        {data && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={handlePageChange}
            isDisabled={isRefreshing}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section
        aria-label="Search and filters"
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div role="search">
          <Input
            type="search"
            aria-label="Search reports"
            placeholder="Search by title, location or ticket ID..."
            leftIcon={<Search size={16} aria-hidden="true" />}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Select label="Status" options={STATUS_FILTER_OPTIONS} value={status} onChange={handleStatusChange} />
          <Select
            label="Priority"
            options={PRIORITY_FILTER_OPTIONS}
            value={priority}
            onChange={handlePriorityChange}
          />
          <Select
            label="Category"
            options={CATEGORY_FILTER_OPTIONS}
            value={category}
            onChange={handleCategoryChange}
          />
          <Select
            label="Building"
            options={BUILDING_FILTER_OPTIONS}
            value={buildingId}
            onChange={handleBuildingChange}
          />
          <Select label="Sort by" options={SORT_OPTIONS} value={sortValue} onChange={handleSortChange} />
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              leftIcon={<FilterX size={14} aria-hidden="true" />}
            >
              Clear filters
            </Button>
          </div>
        )}
      </section>

      <section
        ref={resultsRef}
        aria-labelledby="reports-list-heading"
        aria-busy={isPending}
        className="scroll-mt-24"
      >
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="reports-list-heading" className="text-lg font-semibold text-slate-900">
            {heading}
            {data && !hasError ? ` (${data.total})` : ''}
          </h2>
          <p aria-live="polite" className="text-sm text-slate-600">
            {summary}
          </p>
        </div>
        {body}
      </section>
    </div>
  );
}