import { ArrowRight, Calendar, Folder, MapPin, MessageSquare, UserRound } from 'lucide-react';

import type { Report } from '../../types/report.types';
import { BUILDING_LABELS, CATEGORY_LABELS } from '../../types/report.types';
import PriorityBadge from './PriorityBadge';
import StatusBadge from './StatusBadge';

export interface ReportCardProps {
  report: Report;
  /** Called with the report id when the card is activated. */
  onView: (reportId: string) => void;
  /** Extra classes for layout/placement only (grid spans, margins...). */
  className?: string;
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const formatDate = (iso: string): string => dateFormatter.format(new Date(iso));

const CHIP_CLASSES =
  'inline-flex max-w-full items-start gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700';

export default function ReportCard({ report, onView, className = '' }: ReportCardProps) {
  const locationText = `${BUILDING_LABELS[report.location.buildingId]} - ${report.location.room}`;
  const reporterText = report.isOwnReport ? 'You' : report.reporter.displayName;
  const commentCount = report.comments.length;

  const classes = [
    'group relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm',
    'transition-shadow hover:border-slate-300 hover:shadow-md',
    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#2563eb] has-[:focus-visible]:ring-offset-2',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={classes}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-slate-600">{report.referenceNumber}</span>
          <StatusBadge status={report.status} size="sm" />
        </div>
        <PriorityBadge priority={report.priority} size="sm" />
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug text-slate-900">
        {/* The title is the real button. Its ::after stretches over the whole card,
            so the entire card is clickable while keeping a single focus stop. */}
        <button
          type="button"
          onClick={() => onView(report.id)}
          aria-label={`View details: ${report.title}`}
          className="text-left after:absolute after:inset-0 after:content-[''] focus:outline-none"
        >
          {report.title}
        </button>
      </h3>

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
        {report.description}
      </p>

      <div className="mt-4 flex flex-1 flex-wrap content-start gap-2 border-t border-dashed border-slate-200 pt-4">
        <span className={CHIP_CLASSES}>
          <Folder className="mt-px shrink-0 text-slate-500" size={14} aria-hidden="true" />
          <span className="min-w-0 break-words">
            <span className="sr-only">Category: </span>
            {CATEGORY_LABELS[report.category]}
          </span>
        </span>

        <span className={CHIP_CLASSES}>
          <MapPin className="mt-px shrink-0 text-slate-500" size={14} aria-hidden="true" />
          <span className="min-w-0 break-words">
            <span className="sr-only">Location: </span>
            {locationText}
          </span>
        </span>

        <span className={CHIP_CLASSES}>
          <Calendar className="mt-px shrink-0 text-slate-500" size={14} aria-hidden="true" />
          <span className="min-w-0">
            <span className="sr-only">Submitted: </span>
            <time dateTime={report.createdAt}>{formatDate(report.createdAt)}</time>
          </span>
        </span>

        <span
          className={`${CHIP_CLASSES} ${
            report.isOwnReport ? 'bg-[#dbeafe] font-medium text-[#1e40af]' : ''
          }`}
        >
          <UserRound
            className={`mt-px shrink-0 ${report.isOwnReport ? 'text-[#2563eb]' : 'text-slate-500'}`}
            size={14}
            aria-hidden="true"
          />
          <span className="min-w-0 break-words">
            <span className="sr-only">Reported by: </span>
            {reporterText}
          </span>
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <MessageSquare size={14} aria-hidden="true" />
          {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
        </span>
        <span
          aria-hidden="true"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563eb] group-hover:underline"
        >
          View Details
          <ArrowRight size={14} />
        </span>
      </div>
    </article>
  );
}

/** Placeholder with the same shape as a card, shown while reports load. */
export function ReportCardSkeleton() {
  return (
    <div
      className="flex h-full animate-pulse flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="h-5 w-20 rounded-full bg-slate-200" />
        </div>
        <div className="h-5 w-16 rounded-full bg-slate-200" />
      </div>
      <div className="mt-4 h-5 w-3/4 rounded bg-slate-200" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-5/6 rounded bg-slate-100" />
      </div>
      <div className="mt-4 flex gap-2 border-t border-dashed border-slate-200 pt-4">
        <div className="h-6 w-20 rounded-md bg-slate-100" />
        <div className="h-6 w-32 rounded-md bg-slate-100" />
        <div className="h-6 w-24 rounded-md bg-slate-100" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-slate-100" />
        <div className="h-4 w-24 rounded bg-slate-200" />
      </div>
    </div>
  );
}