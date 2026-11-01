/**
 * EngiCare - Reports service (mock implementation)
 * ------------------------------------------------------------------
 * The ONLY layer the UI is allowed to use to read or write reports.
 * Every function is asynchronous, simulates network latency, and takes
 * the VIEWER (the signed-in user) as its first argument, because what a
 * person may see and do depends on who they are:
 *
 *  - every report is visible in the faculty feed, but the identity of its
 *    reporter is masked (for example "Student (*82)") unless the viewer
 *    owns the report or is a facilities manager (technician / admin);
 *  - only the owner of a report and facilities managers can comment on it;
 *  - only facilities managers can change a status or assign a technician.
 *
 * A real backend must enforce the same rules on the SERVER. The UI hides
 * actions the user cannot perform, but hiding a button is not security.
 *
 * To connect a real backend later, keep the exported function names and
 * signatures and replace the bodies with fetch/axios calls.
 */

import { mockReports, mockUsers } from '../data/mockReports';
import type { StoredComment, StoredReport, StoredTimelineEntry } from '../data/mockReports';
import { USER_ROLE_LABELS } from '../types/auth.types';
import type {
  AddCommentInput,
  AssigneeOption,
  AssignReportInput,
  CreateReportInput,
  PaginatedResponse,
  Report,
  ReportAttachment,
  ReportComment,
  ReportFilters,
  ReportPerson,
  ReportPriority,
  ReportScope,
  ReportSortField,
  ReportStats,
  ReportStatus,
  ReportTimelineEntry,
  ReportUser,
  ReportViewer,
  ServiceError,
  UpdateReportStatusInput,
} from '../types/report.types';
import {
  BUILDING_LABELS,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  STATUS_TRANSITIONS,
  STATUSES_REQUIRING_NOTE,
  canManageReports,
  isBuildingId,
  isOpenStatus,
  isReportCategory,
  isReportPriority,
  isReportStatus,
} from '../types/report.types';

/* ------------------------------------------------------------------ */
/* Validation rules (shared with the forms)                            */
/* ------------------------------------------------------------------ */

export const REPORT_VALIDATION = {
  TITLE_MIN_LENGTH: 5,
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 20,
  DESCRIPTION_MAX_LENGTH: 1000,
  ROOM_MAX_LENGTH: 30,
  FLOOR_MIN: -2,
  FLOOR_MAX: 20,
  MAX_IMAGES: 5,
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
  NOTE_MAX_LENGTH: 300,
  COMMENT_MAX_LENGTH: 500,
} as const;

/* ------------------------------------------------------------------ */
/* Internal state & helpers                                            */
/* ------------------------------------------------------------------ */

const LATENCY_MIN_MS = 350;
const LATENCY_MAX_MS = 800;

const PRIORITY_WEIGHT: Record<ReportPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

const STATUS_WEIGHT: Record<ReportStatus, number> = {
  pending: 1,
  under_review: 2,
  in_progress: 3,
  resolved: 4,
  rejected: 5,
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** In-memory "reports table". Lives for the lifetime of the page. */
let reportsStore: StoredReport[] = clone(mockReports);

/**
 * In-memory "users table", used to turn stored ids into people.
 * Accounts created while the app runs are added when they first act.
 */
const knownUsers = new Map<string, ReportUser>(
  mockUsers.map((user): [string, ReportUser] => [user.id, { ...user }]),
);

const rememberUser = (viewer: ReportViewer): void => {
  knownUsers.set(viewer.id, {
    id: viewer.id,
    fullName: viewer.fullName,
    email: viewer.email,
    role: viewer.role,
  });
};

const delay = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const simulateLatency = (): Promise<void> =>
  delay(LATENCY_MIN_MS + Math.random() * (LATENCY_MAX_MS - LATENCY_MIN_MS));

const createServiceError = (
  code: ServiceError['code'],
  message: string,
  fieldErrors?: ServiceError['fieldErrors'],
): ServiceError => ({
  code,
  message,
  ...(fieldErrors ? { fieldErrors } : {}),
});

/** Type guard used by UI catch blocks. */
export const isServiceError = (value: unknown): value is ServiceError =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  'message' in value &&
  typeof (value as { message: unknown }).message === 'string';

/** Converts anything thrown into the normalized ServiceError shape. */
export const toServiceError = (error: unknown): ServiceError => {
  if (isServiceError(error)) return error;
  if (error instanceof Error) return createServiceError('UNKNOWN', error.message);
  return createServiceError('UNKNOWN', 'Something went wrong. Please try again.');
};

const forbiddenError = (
  message = 'You don’t have permission to do this.',
): ServiceError => createServiceError('FORBIDDEN', message);

const assertManager = (viewer: ReportViewer): void => {
  if (!canManageReports(viewer)) throw forbiddenError();
};

const findStoredReport = (reportId: string): StoredReport => {
  const stored = reportsStore.find((item) => item.id === reportId);
  if (!stored) {
    throw createServiceError('NOT_FOUND', 'This report could not be found.');
  }
  return stored;
};

const replaceStoredReport = (updated: StoredReport): void => {
  reportsStore = reportsStore.map((item) => (item.id === updated.id ? updated : item));
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

const compareReports = (a: StoredReport, b: StoredReport, field: ReportSortField): number => {
  switch (field) {
    case 'priority':
      return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    case 'status':
      return STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status];
    case 'updatedAt':
      return Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
    case 'createdAt':
    default:
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  }
};

const buildNextReferenceNumber = (year: number): string => {
  const highest = reportsStore.reduce((max, report) => {
    const match = /(\d+)$/.exec(report.referenceNumber);
    const value = match ? Number(match[1]) : 0;
    return value > max ? value : max;
  }, 0);
  return `ENG-${year}-${String(highest + 1).padStart(4, '0')}`;
};

/* ------------------------------------------------------------------ */
/* Privacy: turning stored ids into people the viewer may see          */
/* ------------------------------------------------------------------ */

/** A stable two-digit tag derived from the id, so the same person always gets the same mask. */
const maskSuffix = (userId: string): string => {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) % 100;
  }
  return String(hash).padStart(2, '0');
};

/**
 * Real identity is shown when the viewer is the person, when the viewer is a
 * facilities manager, or when the person is facilities staff (their role is
 * public). Everybody else is masked, for example "Student (*82)". An email
 * is only ever revealed to the person and to facilities managers.
 */
const toPerson = (userId: string, viewer: ReportViewer): ReportPerson => {
  const user: ReportUser = knownUsers.get(userId) ?? {
    id: userId,
    fullName: 'Unknown user',
    email: '',
    role: 'student',
  };

  const isSelf = user.id === viewer.id;
  const viewerIsManager = canManageReports(viewer);
  const personIsFacilitiesStaff = canManageReports(user);

  if (isSelf || viewerIsManager || personIsFacilitiesStaff) {
    return {
      id: user.id,
      displayName: user.fullName,
      role: user.role,
      email: isSelf || viewerIsManager ? user.email : null,
      isMasked: false,
    };
  }

  return {
    id: null,
    displayName: `${USER_ROLE_LABELS[user.role]} (*${maskSuffix(user.id)})`,
    role: user.role,
    email: null,
    isMasked: true,
  };
};

const toTimelineEntry = (entry: StoredTimelineEntry, viewer: ReportViewer): ReportTimelineEntry => ({
  id: entry.id,
  type: entry.type,
  title: entry.title,
  message: entry.message,
  createdAt: entry.createdAt,
  actor: toPerson(entry.actorId, viewer),
  ...(entry.status ? { status: entry.status } : {}),
});

const toComment = (comment: StoredComment, viewer: ReportViewer): ReportComment => ({
  id: comment.id,
  reportId: comment.reportId,
  author: toPerson(comment.authorId, viewer),
  message: comment.message,
  createdAt: comment.createdAt,
});

/** Builds the report exactly as this viewer is allowed to see it. */
const toReport = (stored: StoredReport, viewer: ReportViewer): Report => ({
  id: stored.id,
  referenceNumber: stored.referenceNumber,
  title: stored.title,
  description: stored.description,
  category: stored.category,
  status: stored.status,
  priority: stored.priority,
  location: { ...stored.location },
  attachments: stored.attachments.map((attachment) => ({ ...attachment })),
  reporter: toPerson(stored.reporterId, viewer),
  assignee: stored.assigneeId === null ? null : toPerson(stored.assigneeId, viewer),
  timeline: stored.timeline.map((entry) => toTimelineEntry(entry, viewer)),
  comments: stored.comments.map((comment) => toComment(comment, viewer)),
  rejectionReason: stored.rejectionReason,
  isOwnReport: stored.reporterId === viewer.id,
  createdAt: stored.createdAt,
  updatedAt: stored.updatedAt,
  resolvedAt: stored.resolvedAt,
});

/* ------------------------------------------------------------------ */
/* Permissions (used by the UI to show or hide actions)                */
/* ------------------------------------------------------------------ */

/** Only the person who submitted a report and facilities managers may comment on it. */
export const canCommentOnReport = (
  viewer: Pick<ReportViewer, 'role'>,
  report: Pick<Report, 'isOwnReport'>,
): boolean => report.isOwnReport || canManageReports(viewer);

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Validates a create-report payload and returns a map of field errors.
 * Keys: title, description, category, priority, buildingId, floor, room, images.
 * An empty object means the payload is valid. Synchronous, so the form can
 * also call it for instant client-side feedback.
 */
export const validateCreateReportInput = (
  input: CreateReportInput,
): Partial<Record<string, string>> => {
  const errors: Partial<Record<string, string>> = {};
  const rules = REPORT_VALIDATION;

  const title = input.title.trim();
  if (title.length < rules.TITLE_MIN_LENGTH) {
    errors.title = `Title must be at least ${rules.TITLE_MIN_LENGTH} characters.`;
  } else if (title.length > rules.TITLE_MAX_LENGTH) {
    errors.title = `Title must be ${rules.TITLE_MAX_LENGTH} characters or fewer.`;
  }

  const description = input.description.trim();
  if (description.length < rules.DESCRIPTION_MIN_LENGTH) {
    errors.description = `Description must be at least ${rules.DESCRIPTION_MIN_LENGTH} characters.`;
  } else if (description.length > rules.DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${rules.DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }

  if (!isReportCategory(input.category)) {
    errors.category = 'Select a category.';
  }

  if (!isReportPriority(input.priority)) {
    errors.priority = 'Select a priority level.';
  }

  if (!isBuildingId(input.location.buildingId)) {
    errors.buildingId = 'Select a building.';
  }

  if (
    !Number.isInteger(input.location.floor) ||
    input.location.floor < rules.FLOOR_MIN ||
    input.location.floor > rules.FLOOR_MAX
  ) {
    errors.floor = `Floor must be a whole number between ${rules.FLOOR_MIN} and ${rules.FLOOR_MAX}.`;
  }

  const room = input.location.room.trim();
  if (room.length === 0) {
    errors.room = 'Enter the room, hall or lab number.';
  } else if (room.length > rules.ROOM_MAX_LENGTH) {
    errors.room = `Room must be ${rules.ROOM_MAX_LENGTH} characters or fewer.`;
  }

  if (input.images.length > rules.MAX_IMAGES) {
    errors.images = `You can attach up to ${rules.MAX_IMAGES} images.`;
  } else if (input.images.some((image) => !image.file.type.startsWith('image/'))) {
    errors.images = 'Only image files are allowed.';
  } else if (input.images.some((image) => image.file.size > rules.MAX_IMAGE_SIZE_BYTES)) {
    errors.images = `Each image must be ${rules.MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MB or smaller.`;
  }

  return errors;
};

/** Validates the text of a comment. Returns an error message, or undefined when valid. */
export const validateCommentMessage = (message: string): string | undefined => {
  const trimmed = message.trim();
  if (trimmed.length === 0) return 'Write a message before posting.';
  if (trimmed.length > REPORT_VALIDATION.COMMENT_MAX_LENGTH) {
    return `A comment must be ${REPORT_VALIDATION.COMMENT_MAX_LENGTH} characters or fewer.`;
  }
  return undefined;
};

/* ------------------------------------------------------------------ */
/* Public API: reading                                                 */
/* ------------------------------------------------------------------ */

/**
 * Returns a filtered, sorted and paginated list of reports.
 * `scope: 'all'` is the faculty feed, `scope: 'mine'` is "My Reports".
 */
export const getReports = async (
  viewer: ReportViewer,
  filters: ReportFilters = {},
): Promise<PaginatedResponse<Report>> => {
  await simulateLatency();

  const {
    scope = 'all',
    search = '',
    status = 'all',
    priority = 'all',
    category = 'all',
    buildingId = 'all',
    sortBy = 'createdAt',
    sortDirection = 'desc',
    page = 1,
    pageSize = 10,
  } = filters;

  const query = search.trim().toLowerCase();

  const filtered = reportsStore.filter((report) => {
    if (scope === 'mine' && report.reporterId !== viewer.id) return false;
    if (status !== 'all' && report.status !== status) return false;
    if (priority !== 'all' && report.priority !== priority) return false;
    if (category !== 'all' && report.category !== category) return false;
    if (buildingId !== 'all' && report.location.buildingId !== buildingId) return false;

    if (query) {
      /* The reporter is deliberately not searchable, so a search can never reveal who they are. */
      const haystack = [
        report.title,
        report.description,
        report.referenceNumber,
        report.location.room,
        BUILDING_LABELS[report.location.buildingId],
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  const direction = sortDirection === 'asc' ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => direction * compareReports(a, b, sortBy));

  const safePageSize = Math.max(1, Math.floor(pageSize));
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (safePage - 1) * safePageSize;

  return {
    items: sorted.slice(start, start + safePageSize).map((report) => toReport(report, viewer)),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
};

/** Returns the most recently created reports (used by the dashboards). */
export const getRecentReports = async (
  viewer: ReportViewer,
  limit = 5,
  scope: ReportScope = 'all',
): Promise<Report[]> => {
  await simulateLatency();

  const scoped = reportsStore.filter(
    (report) => scope === 'all' || report.reporterId === viewer.id,
  );
  const sorted = [...scoped].sort((a, b) => compareReports(b, a, 'createdAt'));

  return sorted.slice(0, Math.max(1, Math.floor(limit))).map((report) => toReport(report, viewer));
};

/** Returns a single report by its internal id. Throws NOT_FOUND if missing. */
export const getReportById = async (viewer: ReportViewer, reportId: string): Promise<Report> => {
  await simulateLatency();

  return toReport(findStoredReport(reportId), viewer);
};

/**
 * Returns the numbers for the dashboard stat cards.
 * `open` counts pending, under review and in progress reports.
 * `urgent` counts urgent-priority reports that are still open.
 */
export const getReportStats = async (
  viewer: ReportViewer,
  scope: ReportScope = 'all',
): Promise<ReportStats> => {
  await simulateLatency();

  const scoped = reportsStore.filter(
    (report) => scope === 'all' || report.reporterId === viewer.id,
  );

  const countByStatus = (status: ReportStatus): number =>
    scoped.filter((report) => report.status === status).length;

  const resolvedReports = scoped.filter(
    (report) => report.status === 'resolved' && report.resolvedAt !== null,
  );

  const totalResolutionMs = resolvedReports.reduce(
    (sum, report) => sum + (Date.parse(report.resolvedAt as string) - Date.parse(report.createdAt)),
    0,
  );

  const averageResolutionHours =
    resolvedReports.length > 0
      ? Math.round((totalResolutionMs / resolvedReports.length / 3_600_000) * 10) / 10
      : null;

  return {
    total: scoped.length,
    pending: countByStatus('pending'),
    underReview: countByStatus('under_review'),
    inProgress: countByStatus('in_progress'),
    resolved: resolvedReports.length,
    rejected: countByStatus('rejected'),
    open: scoped.filter((report) => isOpenStatus(report.status)).length,
    urgent: scoped.filter((report) => report.priority === 'urgent' && isOpenStatus(report.status))
      .length,
    averageResolutionHours,
  };
};

/** Technicians a report can be assigned to. Facilities managers only. */
export const getAssignableTechnicians = async (viewer: ReportViewer): Promise<AssigneeOption[]> => {
  await simulateLatency();
  assertManager(viewer);

  return Array.from(knownUsers.values())
    .filter((user) => user.role === 'technician')
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((user) => ({ id: user.id, fullName: user.fullName, role: user.role }));
};

/* ------------------------------------------------------------------ */
/* Public API: writing                                                 */
/* ------------------------------------------------------------------ */

/**
 * Creates a new report on behalf of the viewer.
 * Throws VALIDATION_ERROR with `fieldErrors` when the payload is invalid.
 */
export const createReport = async (
  viewer: ReportViewer,
  input: CreateReportInput,
): Promise<Report> => {
  await simulateLatency();

  const fieldErrors = validateCreateReportInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    throw createServiceError(
      'VALIDATION_ERROR',
      'Please fix the highlighted fields and try again.',
      fieldErrors,
    );
  }

  rememberUser(viewer);

  const now = new Date();
  const nowIso = now.toISOString();
  const reportId = `rep-${Date.now()}`;

  let attachments: ReportAttachment[];
  try {
    attachments = await Promise.all(
      input.images.map(
        async (image): Promise<ReportAttachment> => ({
          id: `att-${image.id}`,
          fileName: image.file.name,
          url: await readFileAsDataUrl(image.file),
          mimeType: image.file.type,
          sizeBytes: image.file.size,
          uploadedAt: nowIso,
        }),
      ),
    );
  } catch {
    throw createServiceError('UNKNOWN', 'One of the images could not be processed. Try again.');
  }

  const stored: StoredReport = {
    id: reportId,
    referenceNumber: buildNextReferenceNumber(now.getFullYear()),
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    status: 'pending',
    priority: input.priority,
    location: {
      buildingId: input.location.buildingId,
      floor: input.location.floor,
      room: input.location.room.trim(),
    },
    attachments,
    reporterId: viewer.id,
    assigneeId: null,
    timeline: [
      {
        id: `tl-${reportId}-1`,
        type: 'created',
        title: 'Ticket submitted',
        message: 'Issue ticket was registered in the EngiCare portal.',
        status: 'pending',
        createdAt: nowIso,
        actorId: viewer.id,
      },
    ],
    comments: [],
    rejectionReason: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    resolvedAt: null,
  };

  reportsStore = [stored, ...reportsStore];
  return toReport(stored, viewer);
};

/**
 * Changes the status of a report and adds an entry to its timeline.
 * Facilities managers only. Only the transitions listed in STATUS_TRANSITIONS
 * are allowed, and rejecting a report requires a written reason.
 */
export const updateReportStatus = async (
  viewer: ReportViewer,
  input: UpdateReportStatusInput,
): Promise<Report> => {
  await simulateLatency();
  assertManager(viewer);

  if (!isReportStatus(input.status)) {
    throw createServiceError('VALIDATION_ERROR', 'The selected status is not valid.', {
      status: 'Select a valid status.',
    });
  }

  const current = findStoredReport(input.reportId);

  if (current.status === input.status) {
    throw createServiceError(
      'VALIDATION_ERROR',
      `This report is already marked as ${STATUS_LABELS[input.status]}.`,
      { status: 'Choose a different status.' },
    );
  }

  if (!STATUS_TRANSITIONS[current.status].includes(input.status)) {
    throw createServiceError(
      'VALIDATION_ERROR',
      `A report that is ${STATUS_LABELS[current.status]} can’t be moved to ${STATUS_LABELS[input.status]}.`,
      { status: 'This change is not allowed from the current status.' },
    );
  }

  const note = input.note?.trim() ?? '';

  if (note.length > REPORT_VALIDATION.NOTE_MAX_LENGTH) {
    throw createServiceError('VALIDATION_ERROR', 'The note is too long.', {
      note: `The note must be ${REPORT_VALIDATION.NOTE_MAX_LENGTH} characters or fewer.`,
    });
  }

  if (STATUSES_REQUIRING_NOTE.includes(input.status) && note.length === 0) {
    throw createServiceError('VALIDATION_ERROR', 'A reason is required for this status.', {
      note: 'Write the reason so the reporter understands the decision.',
    });
  }

  rememberUser(viewer);

  const nowIso = new Date().toISOString();
  const isResolved = input.status === 'resolved';
  const isRejected = input.status === 'rejected';

  const entry: StoredTimelineEntry = {
    id: `tl-${current.id}-${Date.now()}`,
    type: isResolved ? 'resolved' : isRejected ? 'rejected' : 'status_changed',
    title: `Status updated to: ${STATUS_LABELS[input.status]}`,
    message: note.length > 0 ? note : STATUS_DESCRIPTIONS[input.status],
    status: input.status,
    createdAt: nowIso,
    actorId: viewer.id,
  };

  const updated: StoredReport = {
    ...current,
    status: input.status,
    timeline: [...current.timeline, entry],
    rejectionReason: isRejected ? note : null,
    resolvedAt: isResolved ? nowIso : null,
    updatedAt: nowIso,
  };

  replaceStoredReport(updated);
  return toReport(updated, viewer);
};

/**
 * Assigns a report to a technician, or removes the assignment when
 * `assigneeId` is null. Facilities managers only.
 */
export const assignReport = async (
  viewer: ReportViewer,
  input: AssignReportInput,
): Promise<Report> => {
  await simulateLatency();
  assertManager(viewer);

  const current = findStoredReport(input.reportId);
  const nowIso = new Date().toISOString();

  let entry: StoredTimelineEntry;

  if (input.assigneeId === null) {
    if (current.assigneeId === null) {
      throw createServiceError('VALIDATION_ERROR', 'This report has no technician assigned.', {
        assigneeId: 'There is no assignment to remove.',
      });
    }

    entry = {
      id: `tl-${current.id}-${Date.now()}`,
      type: 'assigned',
      title: 'Technician unassigned',
      message: 'The technician was removed from this report.',
      createdAt: nowIso,
      actorId: viewer.id,
    };
  } else {
    const technician = knownUsers.get(input.assigneeId);

    if (!technician || technician.role !== 'technician') {
      throw createServiceError('VALIDATION_ERROR', 'Choose a technician from the list.', {
        assigneeId: 'Choose a technician from the list.',
      });
    }

    if (current.assigneeId === technician.id) {
      throw createServiceError(
        'VALIDATION_ERROR',
        `This report is already assigned to ${technician.fullName}.`,
        { assigneeId: 'Choose a different technician.' },
      );
    }

    entry = {
      id: `tl-${current.id}-${Date.now()}`,
      type: 'assigned',
      title: 'Assigned to technician',
      message: `Assigned to ${technician.fullName}.`,
      createdAt: nowIso,
      actorId: viewer.id,
    };
  }

  rememberUser(viewer);

  const updated: StoredReport = {
    ...current,
    assigneeId: input.assigneeId,
    timeline: [...current.timeline, entry],
    updatedAt: nowIso,
  };

  replaceStoredReport(updated);
  return toReport(updated, viewer);
};

/**
 * Posts a comment under a report and returns the updated report.
 * Only the owner of the report and facilities managers may comment.
 */
export const addComment = async (viewer: ReportViewer, input: AddCommentInput): Promise<Report> => {
  await simulateLatency();

  const current = findStoredReport(input.reportId);

  if (current.reporterId !== viewer.id && !canManageReports(viewer)) {
    throw forbiddenError(
      'Only the person who submitted this report and the facilities team can comment.',
    );
  }

  const messageError = validateCommentMessage(input.message);
  if (messageError) {
    throw createServiceError('VALIDATION_ERROR', messageError, { message: messageError });
  }

  rememberUser(viewer);

  const nowIso = new Date().toISOString();

  const comment: StoredComment = {
    id: `cm-${current.id}-${Date.now()}`,
    reportId: current.id,
    authorId: viewer.id,
    message: input.message.trim(),
    createdAt: nowIso,
  };

  const updated: StoredReport = {
    ...current,
    comments: [...current.comments, comment],
    updatedAt: nowIso,
  };

  replaceStoredReport(updated);
  return toReport(updated, viewer);
};

/* ------------------------------------------------------------------ */
/* Service object (convenient single import for the UI)                */
/* ------------------------------------------------------------------ */

export const reportsService = {
  getReports,
  getRecentReports,
  getReportById,
  getReportStats,
  getAssignableTechnicians,
  createReport,
  updateReportStatus,
  assignReport,
  addComment,
  validateCreateReportInput,
  validateCommentMessage,
  canCommentOnReport,
} as const;