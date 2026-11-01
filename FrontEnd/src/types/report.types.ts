/**
 * EngiCare - Report domain types
 * ------------------------------------------------------------------
 * Single source of truth for every data shape used across the app.
 * UI components, mock data and services must import from this file only,
 * so that swapping the mock service for a real REST/GraphQL backend
 * requires no changes in the UI layer.
 */

/* ------------------------------------------------------------------ */
/* Statuses                                                            */
/* ------------------------------------------------------------------ */

export const REPORT_STATUSES = [
  'pending',
  'under_review',
  'in_progress',
  'resolved',
  'rejected',
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

/** Short explanation of each status, shown in tooltips and the update dialog. */
export const STATUS_DESCRIPTIONS: Record<ReportStatus, string> = {
  pending: 'The report was submitted and is waiting for the facilities team.',
  under_review: 'The facilities team is checking the report.',
  in_progress: 'A technician is working on the issue.',
  resolved: 'The issue was fixed and the report is closed.',
  rejected: 'The report was closed without a repair. The reason is shown on the report.',
};

/** A status on the normal path of a report. "Rejected" is a side exit, not a step. */
export type ReportFlowStatus = Exclude<ReportStatus, 'rejected'>;

/** The normal path of a report, in order. Drives the progress bar. */
export const STATUS_FLOW: readonly ReportFlowStatus[] = [
  'pending',
  'under_review',
  'in_progress',
  'resolved',
];

/** Statuses that still need work. */
export const OPEN_STATUSES: readonly ReportStatus[] = ['pending', 'under_review', 'in_progress'];

export const isOpenStatus = (status: ReportStatus): boolean => OPEN_STATUSES.includes(status);

/** Which statuses a facilities manager may move a report to, from each status. */
export const STATUS_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  pending: ['under_review', 'in_progress', 'rejected'],
  under_review: ['in_progress', 'resolved', 'rejected'],
  in_progress: ['resolved', 'under_review'],
  resolved: ['in_progress'],
  rejected: ['under_review'],
};

/** Moving a report to one of these statuses requires a written reason. */
export const STATUSES_REQUIRING_NOTE: readonly ReportStatus[] = ['rejected'];

/* ------------------------------------------------------------------ */
/* Priorities, categories, buildings                                   */
/* ------------------------------------------------------------------ */

export const REPORT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type ReportPriority = (typeof REPORT_PRIORITIES)[number];

export const PRIORITY_LABELS: Record<ReportPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const REPORT_CATEGORIES = [
  'electrical',
  'plumbing',
  'hvac',
  'furniture',
  'it_equipment',
  'lab_equipment',
  'internet',
  'cleanliness',
  'safety',
  'structural',
  'other',
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  hvac: 'Air Conditioning & Ventilation',
  furniture: 'Furniture',
  it_equipment: 'IT Equipment',
  lab_equipment: 'Lab Equipment',
  internet: 'Internet & Network',
  cleanliness: 'Cleanliness',
  safety: 'Safety & Security',
  structural: 'Structural',
  other: 'Other',
};

export const BUILDING_IDS = [
  'main',
  'civil',
  'mechanical',
  'electrical',
  'computer',
  'chemical',
  'labs',
  'library',
] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

export const BUILDING_LABELS: Record<BuildingId, string> = {
  main: 'Main Engineering Building',
  civil: 'Civil Engineering Building',
  mechanical: 'Mechanical Engineering Building',
  electrical: 'Electrical Engineering Building',
  computer: 'Computer Engineering Building',
  chemical: 'Chemical Engineering Building',
  labs: 'Central Laboratories',
  library: 'Engineering Library',
};

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

export type ReportUserRole = 'student' | 'staff' | 'faculty_member' | 'technician' | 'admin';

/** A real user account. The auth layer extends this shape. */
export interface ReportUser {
  id: string;
  fullName: string;
  email: string;
  role: ReportUserRole;
  /** Optional avatar URL. */
  avatarUrl?: string;
}

/** Roles that manage reports (change status, assign, reject). */
export const MANAGER_ROLES: readonly ReportUserRole[] = ['technician', 'admin'];

export const canManageReports = (user: Pick<ReportUser, 'role'>): boolean =>
  MANAGER_ROLES.includes(user.role);

/** The person asking for data. The service decides what they are allowed to see. */
export type ReportViewer = Pick<ReportUser, 'id' | 'fullName' | 'email' | 'role'>;

/**
 * A person as the viewer is allowed to see them.
 * Other people's reports show a masked reporter (for example "Student (*82)"),
 * while the owner and facilities managers see the real name and email.
 */
export interface ReportPerson {
  /** `null` when the identity is hidden from this viewer. */
  id: string | null;
  /** The real full name, or a masked label such as "Student (*82)". */
  displayName: string;
  role: ReportUserRole;
  /** `null` when the email is hidden from this viewer. */
  email: string | null;
  /** True when `displayName` is a masked label rather than a real name. */
  isMasked: boolean;
}

/** Technician offered in the "assign to" list. */
export type AssigneeOption = Pick<ReportUser, 'id' | 'fullName' | 'role'>;

/* ------------------------------------------------------------------ */
/* Core entities                                                       */
/* ------------------------------------------------------------------ */

/** Physical location of the issue inside the faculty. */
export interface ReportLocation {
  buildingId: BuildingId;
  /** Floor number; 0 = ground floor, negative values = basement. */
  floor: number;
  /** Room / hall / lab identifier, e.g. "B-204". */
  room: string;
}

/** Image (or file) attached to a report. */
export interface ReportAttachment {
  id: string;
  fileName: string;
  /** Remote URL or object/data URL for preview. */
  url: string;
  mimeType: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** ISO 8601 timestamp. */
  uploadedAt: string;
}

/** A single event in the maintenance history of a report. */
export interface ReportTimelineEntry {
  id: string;
  type: 'created' | 'status_changed' | 'assigned' | 'resolved' | 'rejected';
  /** Short heading, e.g. "Ticket submitted" or "Status updated to: Resolved". */
  title: string;
  /** One-sentence description of the event. */
  message: string;
  /** Status after this event, when it changes the status. */
  status?: ReportStatus;
  /** ISO 8601 timestamp. */
  createdAt: string;
  actor: ReportPerson;
}

/** A message in the discussion under a report. */
export interface ReportComment {
  id: string;
  reportId: string;
  author: ReportPerson;
  message: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/** Full report entity as returned by the backend for a given viewer. */
export interface Report {
  /** Internal unique identifier. */
  id: string;
  /** Public, human-friendly reference number, e.g. "ENG-2026-0001". */
  referenceNumber: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  priority: ReportPriority;
  location: ReportLocation;
  attachments: ReportAttachment[];
  /** Masked for viewers who are neither the owner nor a facilities manager. */
  reporter: ReportPerson;
  /** Technician / staff member handling the report, if assigned. */
  assignee: ReportPerson | null;
  /** Maintenance history, in the order events happened. */
  timeline: ReportTimelineEntry[];
  /** Discussion messages, in the order they were posted. */
  comments: ReportComment[];
  /** Why the report was rejected. `null` unless the status is "rejected". */
  rejectionReason: string | null;
  /** True when the viewer is the person who submitted the report. */
  isOwnReport: boolean;
  /** ISO 8601 timestamps. */
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Input / query shapes (what the UI sends to the service)             */
/* ------------------------------------------------------------------ */

/** Image selected by the user in the form, before it is uploaded. */
export interface ReportImageInput {
  /** Client-side unique id, used for list keys and removal. */
  id: string;
  file: File;
  /** Object URL used for the preview thumbnail. */
  previewUrl: string;
}

/** Payload for creating a new report. */
export interface CreateReportInput {
  title: string;
  description: string;
  category: ReportCategory;
  priority: ReportPriority;
  location: ReportLocation;
  images: ReportImageInput[];
}

/** Payload for changing the status of an existing report (managers only). */
export interface UpdateReportStatusInput {
  reportId: string;
  status: ReportStatus;
  /** Note added to the timeline. Required when the new status is "rejected". */
  note?: string;
}

/** Payload for assigning a report to a technician (managers only). */
export interface AssignReportInput {
  reportId: string;
  /** `null` removes the current assignment. */
  assigneeId: string | null;
}

/** Payload for posting a comment under a report. */
export interface AddCommentInput {
  reportId: string;
  message: string;
}

/**
 * Which reports a list shows.
 *  - all   every report in the faculty (the "Faculty Feed")
 *  - mine  only the reports the viewer submitted ("My Reports")
 */
export type ReportScope = 'all' | 'mine';

export type ReportSortField = 'createdAt' | 'updatedAt' | 'priority' | 'status';
export type SortDirection = 'asc' | 'desc';

/** Filters accepted by the list endpoint. All fields are optional. */
export interface ReportFilters {
  /** Defaults to "all". */
  scope?: ReportScope;
  /** Free-text search over title, description, reference number and room. */
  search?: string;
  status?: ReportStatus | 'all';
  priority?: ReportPriority | 'all';
  category?: ReportCategory | 'all';
  buildingId?: BuildingId | 'all';
  sortBy?: ReportSortField;
  sortDirection?: SortDirection;
  /** 1-based page index. */
  page?: number;
  pageSize?: number;
}

/* ------------------------------------------------------------------ */
/* Response shapes (what the service returns to the UI)                */
/* ------------------------------------------------------------------ */

/** Generic paginated response wrapper. */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Aggregated numbers displayed on the dashboard stat cards. */
export interface ReportStats {
  total: number;
  pending: number;
  underReview: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  /** Pending + under review + in progress. */
  open: number;
  /** Urgent-priority reports that are still open. */
  urgent: number;
  /** Average resolution time in hours; null when nothing is resolved yet. */
  averageResolutionHours: number | null;
}

/** Normalized error shape thrown by the service layer. */
export interface ServiceError {
  code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN';
  message: string;
  /** Per-field messages for validation errors. */
  fieldErrors?: Partial<Record<string, string>>;
}

/* ------------------------------------------------------------------ */
/* Type guards                                                         */
/* ------------------------------------------------------------------ */

export const isReportStatus = (value: unknown): value is ReportStatus =>
  typeof value === 'string' && (REPORT_STATUSES as readonly string[]).includes(value);

export const isReportPriority = (value: unknown): value is ReportPriority =>
  typeof value === 'string' && (REPORT_PRIORITIES as readonly string[]).includes(value);

export const isReportCategory = (value: unknown): value is ReportCategory =>
  typeof value === 'string' && (REPORT_CATEGORIES as readonly string[]).includes(value);

export const isBuildingId = (value: unknown): value is BuildingId =>
  typeof value === 'string' && (BUILDING_IDS as readonly string[]).includes(value);

export const isReportScope = (value: unknown): value is ReportScope =>
  value === 'all' || value === 'mine';