import { CircleCheck, CircleX, Clock, Search, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { ReportStatus } from '../../types/report.types';
import { STATUS_LABELS } from '../../types/report.types';

export type StatusBadgeSize = 'sm' | 'md';

export interface StatusBadgeProps {
  status: ReportStatus;
  /** Visual size of the badge. Defaults to "md". */
  size?: StatusBadgeSize;
  /** Show the leading icon. Defaults to true. */
  showIcon?: boolean;
  /** Extra classes for layout/placement only (margins, alignment...). */
  className?: string;
}

interface StatusStyle {
  /** Badge background + border + text classes. */
  container: string;
  /** Icon color class. */
  icon: string;
  Icon: LucideIcon;
}

/**
 * Brand palette:
 *  - Pending       amber   #d97706 / #fef3c7
 *  - Under Review  indigo  #4f46e5 / #e0e7ff
 *  - In Progress   blue    #2563eb / #dbeafe
 *  - Resolved      green   #16a34a / #dcfce7
 *  - Rejected      slate   #475569 / #e2e8f0
 *
 * Red is NOT used for "Rejected" on purpose: red is reserved for
 * High / Urgent priority, and the two badges often sit in the same row.
 * Using neutral slate keeps "this report is closed without a repair"
 * visually different from "this report is dangerous".
 *
 * The saturated brand color is used for the icon and the border accent,
 * while the label uses a darker shade of the same hue so the text keeps
 * a WCAG AA contrast ratio on the light tinted background.
 * Full class names are written out so Tailwind can detect them.
 */
const STATUS_STYLES: Record<ReportStatus, StatusStyle> = {
  pending: {
    container: 'bg-[#fef3c7] text-[#92400e] border-[#d97706]/30',
    icon: 'text-[#d97706]',
    Icon: Clock,
  },
  under_review: {
    container: 'bg-[#e0e7ff] text-[#3730a3] border-[#4f46e5]/30',
    icon: 'text-[#4f46e5]',
    Icon: Search,
  },
  in_progress: {
    container: 'bg-[#dbeafe] text-[#1e40af] border-[#2563eb]/30',
    icon: 'text-[#2563eb]',
    Icon: Wrench,
  },
  resolved: {
    container: 'bg-[#dcfce7] text-[#166534] border-[#16a34a]/30',
    icon: 'text-[#16a34a]',
    Icon: CircleCheck,
  },
  rejected: {
    container: 'bg-[#e2e8f0] text-[#334155] border-[#475569]/30',
    icon: 'text-[#475569]',
    Icon: CircleX,
  },
};

const SIZE_STYLES: Record<StatusBadgeSize, { container: string; icon: number }> = {
  sm: { container: 'gap-1 px-2 py-0.5 text-xs', icon: 12 },
  md: { container: 'gap-1.5 px-2.5 py-1 text-sm', icon: 14 },
};

export default function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}: StatusBadgeProps) {
  const { container, icon, Icon } = STATUS_STYLES[status];
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
      {STATUS_LABELS[status]}
    </span>
  );
}