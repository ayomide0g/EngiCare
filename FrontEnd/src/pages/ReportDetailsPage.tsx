import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  CircleCheck,
  CircleX,
  FilePlus,
  Folder,
  MapPin,
  RefreshCw,
  TriangleAlert,
  UserCheck,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import Button from '../components/ui/Button';
import CommentsSection from '../components/ui/CommentsSection';
import { Textarea } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import PriorityBadge from '../components/ui/PriorityBadge';
import Select from '../components/ui/Select';
import type { SelectOption } from '../components/ui/Select';
import StatusBadge from '../components/ui/StatusBadge';
import { useCurrentUser } from '../context/useAuth';
import {
  REPORT_VALIDATION,
  addComment,
  assignReport,
  canCommentOnReport,
  getAssignableTechnicians,
  getReportById,
  toServiceError,
  updateReportStatus,
} from '../services/reports.service';
import { USER_ROLE_LABELS } from '../types/auth.types';
import type {
  AssigneeOption,
  Report,
  ReportAttachment,
  ReportFlowStatus,
  ReportPerson,
  ReportStatus,
  ReportTimelineEntry,
  ServiceError,
} from '../types/report.types';
import {
  BUILDING_LABELS,
  CATEGORY_LABELS,
  STATUS_DESCRIPTIONS,
  STATUS_FLOW,
  STATUS_LABELS,
  STATUS_TRANSITIONS,
  STATUSES_REQUIRING_NOTE,
  canManageReports,
  isReportStatus,
} from '../types/report.types';

export interface ReportDetailsPageProps {
  /** Internal id of the report. The parent should set `key={reportId}`. */
  reportId: string;
  onBack: () => void;
  /** Text of the back button, e.g. "Back to my reports". */
  backLabel?: string;
  /** Called after anything changed (status, assignment, comment), e.g. to refresh counters. */
  onReportChanged?: () => void;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const formatDateTime = (iso: string): string => dateTimeFormatter.format(new Date(iso));

const formatFloor = (floor: number): string => {
  if (floor === 0) return 'Ground floor';
  if (floor < 0) return `Basement ${Math.abs(floor)}`;
  return `Floor ${floor}`;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (milliseconds: number): string => {
  const minutes = Math.max(1, Math.round(milliseconds / 60_000));
  if (minutes < 60) return `${minutes} min`;

  const hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours * 10) / 10} h`;

  return `${Math.round((hours / 24) * 10) / 10} days`;
};

const getInitials = (fullName: string): string => {
  const parts = fullName
    .replace(/^(dr|eng|prof)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]';

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

interface CardProps {
  title: string;
  headingId: string;
  children: ReactNode;
}

function Card({ title, headingId, children }: CardProps) {
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 id={headingId} className="text-base font-semibold text-slate-900">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

interface DetailRowProps {
  label: string;
  children: ReactNode;
}

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 text-sm">
      <dt className="shrink-0 text-slate-600">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

interface MetaItemProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}

function MetaItem({ icon: Icon, label, children }: MetaItemProps) {
  return (
    <div className="flex items-start gap-2 text-sm text-slate-700">
      <Icon className="mt-0.5 shrink-0 text-slate-500" size={16} aria-hidden="true" />
      <p className="min-w-0 break-words">
        <span className="font-medium text-slate-900">{label}: </span>
        {children}
      </p>
    </div>
  );
}

interface PersonBlockProps {
  heading: string;
  person: ReportPerson | null;
  isSelf: boolean;
  emptyText: string;
}

function PersonBlock({ heading, person, isSelf, emptyText }: PersonBlockProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-600">{heading}</p>
      {person ? (
        <div className="mt-2 flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e293b] text-sm font-semibold text-white"
            aria-hidden="true"
          >
            {person.isMasked ? <UserRound size={18} /> : getInitials(person.displayName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {isSelf ? `${person.displayName} (you)` : person.displayName}
            </p>
            <p className="truncate text-xs text-slate-600">
              {USER_ROLE_LABELS[person.role]}
              {person.email ? ` · ${person.email}` : ''}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-600">{emptyText}</p>
      )}
    </div>
  );
}

const CURRENT_STEP_STYLES: Record<ReportFlowStatus, { border: string; dot: string }> = {
  pending: { border: 'border-[#d97706]', dot: 'bg-[#d97706]' },
  under_review: { border: 'border-[#4f46e5]', dot: 'bg-[#4f46e5]' },
  in_progress: { border: 'border-[#2563eb]', dot: 'bg-[#2563eb]' },
  resolved: { border: 'border-[#16a34a]', dot: 'bg-[#16a34a]' },
};

function StatusProgress({ status }: { status: ReportStatus }) {
  const currentIndex = (STATUS_FLOW as readonly ReportStatus[]).indexOf(status);

  return (
    <ol aria-label="Report progress" className="grid grid-cols-4">
      {STATUS_FLOW.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFinal = isCurrent && step === 'resolved';

        let circleClasses = 'border-2 border-slate-300 bg-white';
        if (isDone) circleClasses = 'bg-[#0f172a] text-white';
        else if (isFinal) circleClasses = 'bg-[#16a34a] text-white';
        else if (isCurrent) circleClasses = `border-2 bg-white ${CURRENT_STEP_STYLES[step].border}`;

        return (
          <li
            key={step}
            aria-current={isCurrent ? 'step' : undefined}
            className="relative flex flex-col items-center text-center"
          >
            {index < STATUS_FLOW.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute left-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${
                  index < currentIndex ? 'bg-[#0f172a]' : 'bg-slate-200'
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${circleClasses}`}
            >
              {isDone || isFinal ? (
                <Check size={16} strokeWidth={3} aria-hidden="true" />
              ) : isCurrent ? (
                <span className={`h-2.5 w-2.5 rounded-full ${CURRENT_STEP_STYLES[step].dot}`} />
              ) : null}
            </span>
            <span
              className={`mt-2 text-xs font-medium ${isCurrent ? 'text-slate-900' : 'text-slate-600'}`}
            >
              {STATUS_LABELS[step]}
              {isDone && <span className="sr-only"> (completed)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface TimelineStyle {
  icon: LucideIcon;
  tile: string;
  iconClass: string;
}

const TIMELINE_STYLES: Record<ReportTimelineEntry['type'], TimelineStyle> = {
  created: { icon: FilePlus, tile: 'bg-slate-100', iconClass: 'text-[#1e293b]' },
  assigned: { icon: UserCheck, tile: 'bg-[#dbeafe]', iconClass: 'text-[#2563eb]' },
  status_changed: { icon: RefreshCw, tile: 'bg-[#dbeafe]', iconClass: 'text-[#2563eb]' },
  resolved: { icon: CircleCheck, tile: 'bg-[#dcfce7]', iconClass: 'text-[#16a34a]' },
  rejected: { icon: CircleX, tile: 'bg-[#e2e8f0]', iconClass: 'text-[#475569]' },
};

function Timeline({ entries }: { entries: ReportTimelineEntry[] }) {
  return (
    <ol>
      {entries.map((entry, index) => {
        const { icon: Icon, tile, iconClass } = TIMELINE_STYLES[entry.type];
        const isLast = index === entries.length - 1;

        return (
          <li key={entry.id} className={`relative flex gap-4 ${isLast ? '' : 'pb-6'}`}>
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-[17px] top-9 w-0.5 bg-slate-200"
              />
            )}
            <span
              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tile} ${
                isLast ? 'ring-2 ring-[#2563eb] ring-offset-2' : ''
              }`}
            >
              <Icon className={iconClass} size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <time dateTime={entry.createdAt} className="block text-xs text-slate-600">
                {formatDateTime(entry.createdAt)}
              </time>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{entry.title}</p>
              <p className="mt-0.5 break-words text-sm text-slate-700">{entry.message}</p>
              <p className="mt-1 text-xs text-slate-600">by {entry.actor.displayName}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DetailsSkeleton() {
  return (
    <div className="animate-pulse space-y-6" role="status" aria-label="Loading report">
      <div className="h-9 w-40 rounded-lg bg-slate-200" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="h-7 w-3/4 rounded bg-slate-200" />
            <div className="h-16 rounded bg-slate-100" />
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
            <div className="h-5 w-28 rounded bg-slate-200" />
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-5/6 rounded bg-slate-100" />
          </div>
        </div>
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
          <div className="h-5 w-32 rounded bg-slate-200" />
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-full rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ReportDetailsPage({
  reportId,
  onBack,
  backLabel = 'Back to reports',
  onReportChanged,
}: ReportDetailsPageProps) {
  const user = useCurrentUser();
  const isManager = canManageReports(user);

  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<ServiceError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const [previewImage, setPreviewImage] = useState<ReportAttachment | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ReportStatus>('under_review');
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [technicians, setTechnicians] = useState<AssigneeOption[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const loaded = await getReportById(user, reportId);
        if (isCancelled) return;
        setReport(loaded);
        setLoadError(null);
      } catch (error) {
        if (isCancelled) return;
        setLoadError(toServiceError(error));
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [user, reportId, reloadKey]);

  /* Facilities managers need the list of technicians for the "assign" panel. */
  useEffect(() => {
    if (!isManager) return undefined;

    let isCancelled = false;

    const loadTechnicians = async () => {
      try {
        const list = await getAssignableTechnicians(user);
        if (!isCancelled) setTechnicians(list);
      } catch {
        /* The assign panel simply stays empty. */
      }
    };

    void loadTechnicians();

    return () => {
      isCancelled = true;
    };
  }, [user, isManager]);

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    setReloadKey((key) => key + 1);
  };

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      onClick={onBack}
      leftIcon={<ArrowLeft size={16} aria-hidden="true" />}
      className="-ml-2"
    >
      {backLabel}
    </Button>
  );

  if (isLoading) {
    return <DetailsSkeleton />;
  }

  if (loadError || !report) {
    const isNotFound = loadError?.code === 'NOT_FOUND';

    return (
      <div className="space-y-6">
        {backButton}
        <div
          role="alert"
          className="mx-auto flex max-w-md flex-col items-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fee2e2]">
            <TriangleAlert className="text-[#dc2626]" size={24} aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            {isNotFound ? 'Report not found' : 'Couldn’t load this report'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {loadError?.message ?? 'Something went wrong. Please try again.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {!isNotFound && (
              <Button
                variant="outline"
                onClick={handleRetry}
                leftIcon={<RefreshCw size={16} aria-hidden="true" />}
              >
                Try again
              </Button>
            )}
            <Button onClick={onBack}>{backLabel}</Button>
          </div>
        </div>
      </div>
    );
  }

  const applyUpdated = (updated: Report, message: string | null) => {
    setReport(updated);
    setNotice(message);
    onReportChanged?.();
  };

  /* ----------------------------- Status ---------------------------- */

  const allowedStatuses = STATUS_TRANSITIONS[report.status];
  const noteRequired = STATUSES_REQUIRING_NOTE.includes(newStatus);

  const statusOptions: SelectOption[] = allowedStatuses.map((value) => ({
    value,
    label: STATUS_LABELS[value],
  }));

  const openStatusModal = () => {
    setNewStatus(allowedStatuses[0]);
    setNote('');
    setNoteError(null);
    setUpdateError(null);
    setNotice(null);
    setIsStatusModalOpen(true);
  };

  const closeStatusModal = () => {
    if (isUpdating) return;
    setIsStatusModalOpen(false);
  };

  const handleConfirmStatus = async () => {
    if (isUpdating) return;

    const trimmedNote = note.trim();
    if (noteRequired && trimmedNote.length === 0) {
      setNoteError('Write the reason so the reporter understands the decision.');
      return;
    }

    setIsUpdating(true);
    setNoteError(null);
    setUpdateError(null);

    try {
      const updated = await updateReportStatus(user, {
        reportId: report.id,
        status: newStatus,
        note: trimmedNote.length > 0 ? trimmedNote : undefined,
      });

      setIsStatusModalOpen(false);
      applyUpdated(updated, `Status changed to ${STATUS_LABELS[updated.status]}.`);
    } catch (error) {
      const serviceError = toServiceError(error);
      const fieldNoteError = serviceError.fieldErrors?.note;
      setNoteError(fieldNoteError ?? null);
      setUpdateError(fieldNoteError ? null : serviceError.message);
    } finally {
      setIsUpdating(false);
    }
  };

  /* --------------------------- Assignment -------------------------- */

  const technicianOptions: SelectOption[] = technicians.map((technician) => ({
    value: technician.id,
    label: technician.fullName,
  }));

  const handleAssign = async (assigneeId: string | null) => {
    if (isAssigning) return;

    if (assigneeId !== null && assigneeId === '') {
      setAssignError('Choose a technician first.');
      return;
    }

    setIsAssigning(true);
    setAssignError(null);

    try {
      const updated = await assignReport(user, { reportId: report.id, assigneeId });
      setSelectedTechnician('');
      applyUpdated(
        updated,
        assigneeId === null ? 'The technician was unassigned.' : 'The technician was assigned.',
      );
    } catch (error) {
      setAssignError(toServiceError(error).message);
    } finally {
      setIsAssigning(false);
    }
  };

  /* ----------------------------- Comments -------------------------- */

  const handlePostComment = async (message: string): Promise<void> => {
    const updated = await addComment(user, { reportId: report.id, message });
    applyUpdated(updated, null);
  };

  const resolutionTime =
    report.resolvedAt !== null
      ? formatDuration(Date.parse(report.resolvedAt) - Date.parse(report.createdAt))
      : null;

  const reporterText = report.isOwnReport ? 'You' : report.reporter.displayName;

  return (
    <div className="space-y-6">
      {backButton}

      {notice && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-[#16a34a]/30 bg-[#dcfce7] p-4"
        >
          <CircleCheck className="shrink-0 text-[#16a34a]" size={20} aria-hidden="true" />
          <p className="text-sm font-medium text-[#166534]">{notice}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section
            aria-labelledby="report-title"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-slate-600">{report.referenceNumber}</span>
                <StatusBadge status={report.status} />
              </div>
              <PriorityBadge priority={report.priority} />
            </div>

            <h2 id="report-title" className="mt-4 text-2xl font-semibold text-slate-900">
              {report.title}
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MetaItem icon={Folder} label="Category">
                {CATEGORY_LABELS[report.category]}
              </MetaItem>
              <MetaItem icon={MapPin} label="Location">
                {BUILDING_LABELS[report.location.buildingId]} - {report.location.room}
              </MetaItem>
              <MetaItem icon={UserRound} label="Submitted by">
                {reporterText}
              </MetaItem>
              <MetaItem icon={Calendar} label="Date">
                {formatDateTime(report.createdAt)}
              </MetaItem>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6">
              {report.status === 'rejected' ? (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-lg border border-[#475569]/30 bg-[#e2e8f0] p-4"
                >
                  <CircleX className="mt-0.5 shrink-0 text-[#475569]" size={20} aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[#334155]">This report was rejected</p>
                    <p className="mt-1 break-words text-sm text-[#334155]">
                      {report.rejectionReason ?? STATUS_DESCRIPTIONS.rejected}
                    </p>
                  </div>
                </div>
              ) : (
                <StatusProgress status={report.status} />
              )}
            </div>
          </section>

          <Card title="Description & Issues" headingId="report-description-heading">
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">
              {report.description}
            </p>
          </Card>

          {report.attachments.length > 0 && (
            <Card title="Photos" headingId="report-photos-heading">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {report.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(attachment)}
                      aria-label={`View ${attachment.fileName} larger`}
                      className={`block w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition-shadow hover:shadow-md ${FOCUS_RING}`}
                    >
                      <img
                        src={attachment.url}
                        alt={attachment.fileName}
                        className="aspect-[4/3] w-full bg-slate-100 object-cover"
                      />
                      <span className="block px-2.5 py-2">
                        <span className="block truncate text-xs font-medium text-slate-800">
                          {attachment.fileName}
                        </span>
                        <span className="block text-xs text-slate-600">
                          {formatBytes(attachment.sizeBytes)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Maintenance Timeline" headingId="report-timeline-heading">
            <Timeline entries={report.timeline} />
          </Card>

          <CommentsSection
            comments={report.comments}
            viewerId={user.id}
            canComment={canCommentOnReport(user, report)}
            onPost={handlePostComment}
          />
        </div>

        <div className="space-y-6">
          {isManager && (
            <Card title="Manage report" headingId="report-manage-heading">
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-slate-600">
                    Current status: <span className="font-medium text-slate-900">{STATUS_LABELS[report.status]}</span>
                  </p>
                  <Button
                    className="mt-3"
                    fullWidth
                    onClick={openStatusModal}
                    leftIcon={<RefreshCw size={16} aria-hidden="true" />}
                  >
                    Update status
                  </Button>
                </div>

                <div className="border-t border-slate-200 pt-5">
                  <Select
                    label="Assign technician"
                    placeholder="Select a technician"
                    options={technicianOptions}
                    value={selectedTechnician}
                    disabled={isAssigning}
                    onChange={(event) => {
                      setSelectedTechnician(event.target.value);
                      setAssignError(null);
                    }}
                    error={assignError ?? undefined}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={isAssigning}
                      loadingText="Saving..."
                      onClick={() => {
                        void handleAssign(selectedTechnician);
                      }}
                    >
                      Assign
                    </Button>
                    {report.assignee !== null && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isAssigning}
                        onClick={() => {
                          void handleAssign(null);
                        }}
                      >
                        Unassign
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card title="Report details" headingId="report-details-heading">
            <dl className="-my-3 divide-y divide-slate-200">
              <DetailRow label="Reference">{report.referenceNumber}</DetailRow>
              <DetailRow label="Category">{CATEGORY_LABELS[report.category]}</DetailRow>
              <DetailRow label="Building">{BUILDING_LABELS[report.location.buildingId]}</DetailRow>
              <DetailRow label="Floor">{formatFloor(report.location.floor)}</DetailRow>
              <DetailRow label="Room">{report.location.room}</DetailRow>
              <DetailRow label="Submitted">{formatDateTime(report.createdAt)}</DetailRow>
              <DetailRow label="Last updated">{formatDateTime(report.updatedAt)}</DetailRow>
              {report.resolvedAt !== null && (
                <DetailRow label="Resolved">{formatDateTime(report.resolvedAt)}</DetailRow>
              )}
              {resolutionTime !== null && (
                <DetailRow label="Time to resolve">{resolutionTime}</DetailRow>
              )}
            </dl>
          </Card>

          <Card title="People" headingId="report-people-heading">
            <div className="space-y-5">
              <PersonBlock
                heading="Reported by"
                person={report.reporter}
                isSelf={report.isOwnReport}
                emptyText="Unknown"
              />
              {report.reporter.isMasked && (
                <p className="text-xs text-slate-600">
                  The reporter’s identity is hidden to protect their privacy.
                </p>
              )}
              <PersonBlock
                heading="Assigned to"
                person={report.assignee}
                isSelf={report.assignee?.id === user.id}
                emptyText="Not assigned yet"
              />
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={previewImage !== null}
        onClose={() => setPreviewImage(null)}
        title={previewImage?.fileName ?? 'Photo'}
        description={
          previewImage
            ? `${formatBytes(previewImage.sizeBytes)} · Uploaded ${formatDateTime(previewImage.uploadedAt)}`
            : undefined
        }
        size="lg"
      >
        {previewImage && (
          <img
            src={previewImage.url}
            alt={previewImage.fileName}
            className="mx-auto max-h-[65vh] w-auto max-w-full rounded-lg bg-slate-100 object-contain"
          />
        )}
      </Modal>

      <Modal
        isOpen={isStatusModalOpen}
        onClose={closeStatusModal}
        title="Update report status"
        description={`Report ${report.referenceNumber}`}
        size="sm"
        closeOnEscape={!isUpdating}
        closeOnOverlayClick={!isUpdating}
        hideCloseButton={isUpdating}
        footer={
          <>
            <Button variant="outline" onClick={closeStatusModal} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              variant={newStatus === 'rejected' ? 'danger' : 'primary'}
              onClick={() => {
                void handleConfirmStatus();
              }}
              isLoading={isUpdating}
              loadingText="Saving..."
            >
              Save status
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {updateError && (
            <div
              role="alert"
              className="rounded-lg border border-[#dc2626]/30 bg-[#fee2e2] p-3 text-sm font-medium text-[#991b1b]"
            >
              {updateError}
            </div>
          )}

          <Select
            label="New status"
            options={statusOptions}
            value={newStatus}
            disabled={isUpdating}
            hint={STATUS_DESCRIPTIONS[newStatus]}
            onChange={(event) => {
              const value = event.target.value;
              if (isReportStatus(value)) {
                setNewStatus(value);
                setNoteError(null);
              }
            }}
          />

          <Textarea
            label={noteRequired ? 'Reason' : 'Note'}
            required={noteRequired}
            rows={3}
            showCount
            maxLength={REPORT_VALIDATION.NOTE_MAX_LENGTH}
            placeholder={
              noteRequired
                ? 'Explain why this report is being rejected'
                : 'Add a short update for the reporter'
            }
            hint={noteRequired ? undefined : 'Optional. It will appear in the maintenance timeline.'}
            value={note}
            disabled={isUpdating}
            onChange={(event) => {
              setNote(event.target.value);
              setNoteError(null);
            }}
            error={noteError ?? undefined}
          />
        </div>
      </Modal>
    </div>
  );
}