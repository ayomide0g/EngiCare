import { ChevronDown, ChevronsUp, Minus, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { ReportPriority } from '../../types/report.types';
import { PRIORITY_LABELS } from '../../types/report.types';

export type PriorityBadgeSize = 'sm' | 'md';

export interface PriorityBadgeProps {
  priority: ReportPriority;
  /** Visual size of the badge. Defaults to "md". */
  size?: PriorityBadgeSize;
  /** Show the leading icon. Defaults to true. */
  showIcon?: boolean;
  /** Extra classes for layout/placement only (margins, alignment...). */
  className?: string;
}

interface PriorityStyle {
  /** Badge background + border + text classes. */
  container: string;
  /** Icon color class. */
  icon: string;
  Icon: LucideIcon;
}

/**
 * Brand palette: red (#dc2626 / #fee2e2) is reserved for Urgent / High.
 *  - Urgent  solid red with white text (the strongest visual weight)
 *  - High    light red tint with dark red text
 *  - Medium  neutral slate
 *  - Low     lighter neutral slate
 *
 * Medium and Low deliberately use neutral slate instead of amber/green,
 * so priority is never confused with the Pending / Resolved status colors.
 * Full class names are written out so Tailwind can detect them.
 */
const PRIORITY_STYLES: Record<ReportPriority, PriorityStyle> = {
  urgent: {
    container: 'bg-[#dc2626] text-white border-[#b91c1c]',
    icon: 'text-white',
    Icon: TriangleAlert,
  },
  high: {
    container: 'bg-[#fee2e2] text-[#991b1b] border-[#dc2626]/30',
    icon: 'text-[#dc2626]',
    Icon: ChevronsUp,
  },
  medium: {
    container: 'bg-slate-200 text-slate-800 border-slate-300',
    icon: 'text-slate-600',
    Icon: Minus,
  },
  low: {
    container: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: 'text-slate-500',
    Icon: ChevronDown,
  },
};

const SIZE_STYLES: Record<PriorityBadgeSize, { container: string; icon: number }> = {
  sm: { container: 'gap-1 px-2 py-0.5 text-xs', icon: 12 },
  md: { container: 'gap-1.5 px-2.5 py-1 text-sm', icon: 14 },
};

export default function PriorityBadge({
  priority,
  size = 'md',
  showIcon = true,
  className = '',
}: PriorityBadgeProps) {
  const { container, icon, Icon } = PRIORITY_STYLES[priority];
  const sizeStyle = SIZE_STYLES[size];

  const classes = [
    'inline-flex items-center whitespace-nowrap rounded-full border font-medium leading-none',
    container,
    sizeStyle.container,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {showIcon && (
        <Icon className={`shrink-0 ${icon}`} size={sizeStyle.icon} strokeWidth={2.25} aria-hidden="true" />
      )}
      {PRIORITY_LABELS[priority]}
    </span>
  );
}