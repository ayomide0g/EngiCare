import type { LucideIcon } from 'lucide-react';

export type StatCardTone = 'neutral' | 'pending' | 'in_progress' | 'resolved' | 'urgent';

export interface StatCardProps {
  /** Short label shown above the number, e.g. "Pending". */
  label: string;
  /** The number to display. `null` renders an em dash (no data yet). */
  value: number | string | null;
  /** Lucide icon component shown in the colored tile. */
  icon: LucideIcon;
  /** Color theme, matched to the report status / priority palette. */
  tone?: StatCardTone;
  /** Optional small line under the number, e.g. "Needs attention". */
  description?: string;
  /** Shows a skeleton placeholder instead of the content. */
  isLoading?: boolean;
  /** When provided, the whole card becomes a clickable button. */
  onClick?: () => void;
  /** Extra classes for layout/placement only (grid spans, margins...). */
  className?: string;
}

interface ToneStyle {
  /** Icon tile background. */
  tile: string;
  /** Icon color. */
  icon: string;
  /** Description text color (a darker shade, WCAG AA on white). */
  description: string;
}

/**
 * Brand palette:
 *  - Pending     amber  #d97706 / #fef3c7
 *  - In Progress blue   #2563eb / #dbeafe
 *  - Resolved    green  #16a34a / #dcfce7
 *  - Urgent      red    #dc2626 / #fee2e2
 *  - Neutral     navy   #1e293b on slate-100
 * Full class names are written out so Tailwind can detect them.
 */
const TONE_STYLES: Record<StatCardTone, ToneStyle> = {
  neutral: {
    tile: 'bg-slate-100',
    icon: 'text-[#1e293b]',
    description: 'text-slate-600',
  },
  pending: {
    tile: 'bg-[#fef3c7]',
    icon: 'text-[#d97706]',
    description: 'text-[#92400e]',
  },
  in_progress: {
    tile: 'bg-[#dbeafe]',
    icon: 'text-[#2563eb]',
    description: 'text-[#1e40af]',
  },
  resolved: {
    tile: 'bg-[#dcfce7]',
    icon: 'text-[#16a34a]',
    description: 'text-[#166534]',
  },
  urgent: {
    tile: 'bg-[#fee2e2]',
    icon: 'text-[#dc2626]',
    description: 'text-[#991b1b]',
  },
};

const CARD_BASE =
  'block w-full rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm';

const CARD_INTERACTIVE =
  'transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]';

const formatValue = (value: number | string | null): string => {
  if (value === null) return '\u2014';
  if (typeof value === 'number') return value.toLocaleString('en-US');
  return value;
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  description,
  isLoading = false,
  onClick,
  className = '',
}: StatCardProps) {
  const toneStyle = TONE_STYLES[tone];

  const content = isLoading ? (
    <div className="flex animate-pulse items-start justify-between gap-4" aria-hidden="true">
      <div className="flex-1 space-y-3">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="h-8 w-16 rounded bg-slate-200" />
        <div className="h-3 w-32 rounded bg-slate-100" />
      </div>
      <div className="h-11 w-11 shrink-0 rounded-lg bg-slate-200" />
    </div>
  ) : (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-600">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          {formatValue(value)}
        </p>
        {description && (
          <p className={`mt-1.5 text-xs font-medium ${toneStyle.description}`}>{description}</p>
        )}
      </div>
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneStyle.tile}`}
      >
        <Icon className={toneStyle.icon} size={22} strokeWidth={2} aria-hidden="true" />
      </div>
    </div>
  );

  if (onClick && !isLoading) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[CARD_BASE, CARD_INTERACTIVE, 'cursor-pointer', className]
          .filter(Boolean)
          .join(' ')}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={[CARD_BASE, className].filter(Boolean).join(' ')}
      aria-busy={isLoading || undefined}
      role={isLoading ? 'status' : undefined}
      aria-label={isLoading ? `Loading ${label}` : undefined}
    >
      {content}
    </div>
  );
}