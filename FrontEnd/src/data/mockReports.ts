/**
 * EngiCare - Mock report data
 * ------------------------------------------------------------------
 * Seed data used by the mock service (reports.service.ts). UI components
 * must NEVER import this file; they talk to the service layer only.
 *
 * Records are stored the way a database would store them: people are
 * referenced by id only (reporterId, assigneeId, actorId, authorId). The
 * service turns them into `Report` objects for a specific viewer, masking
 * the reporter identity when the viewer is not allowed to see it.
 *
 * Users come from mockAccounts.ts, so every report belongs to a real
 * account. Derived fields (status, updatedAt, resolvedAt, rejectionReason)
 * are computed from the timeline, so they can never disagree with it.
 */

import type {
  ReportAttachment,
  ReportCategory,
  ReportLocation,
  ReportPriority,
  ReportStatus,
  ReportTimelineEntry,
  ReportUser,
} from '../types/report.types';
import { STATUS_LABELS } from '../types/report.types';
import { mockAccounts } from './mockAccounts';

/* ------------------------------------------------------------------ */
/* Stored record shapes (what the "database" holds)                    */
/* ------------------------------------------------------------------ */

export interface StoredTimelineEntry {
  id: string;
  type: ReportTimelineEntry['type'];
  title: string;
  message: string;
  status?: ReportStatus;
  /** ISO 8601 timestamp. */
  createdAt: string;
  actorId: string;
}

export interface StoredComment {
  id: string;
  reportId: string;
  authorId: string;
  message: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

export interface StoredReport {
  id: string;
  referenceNumber: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  priority: ReportPriority;
  location: ReportLocation;
  attachments: ReportAttachment[];
  reporterId: string;
  assigneeId: string | null;
  timeline: StoredTimelineEntry[];
  comments: StoredComment[];
  rejectionReason: string | null;
  /** ISO 8601 timestamps. */
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Users (taken from the accounts, never duplicated here)              */
/* ------------------------------------------------------------------ */

export const mockUsers: ReportUser[] = mockAccounts.map(({ user }) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
}));

/** Technicians that reports can be assigned to. */
export const MOCK_TECHNICIANS: ReportUser[] = mockUsers.filter((user) => user.role === 'technician');

const usersById = new Map<string, ReportUser>(mockUsers.map((user) => [user.id, user]));

const nameOf = (userId: string): string => usersById.get(userId)?.fullName ?? 'Unknown user';

/** Finds a seed user by the part of the email before "@". Fails loudly if it does not exist. */
const requireUserId = (localPart: string): string => {
  const account = mockAccounts.find(({ user }) => user.email.split('@')[0] === localPart);
  if (!account) {
    throw new Error(`mockReports: unknown seed user "${localPart}".`);
  }
  return account.user.id;
};

const AHMED = requireUserId('ahmed.khalil');
const SARA = requireUserId('sara.hassan');
const OMAR = requireUserId('omar.nasser');
const LINA = requireUserId('lina.mansour');
const YOUSEF = requireUserId('yousef.haddad');
const KHALED = requireUserId('khaled.mahmoud');
const RANIA = requireUserId('rania.saleh');
const TARIQ = requireUserId('tariq.aziz');
const MONA = requireUserId('mona.farouk');

/* ------------------------------------------------------------------ */
/* Builders (private to this file)                                     */
/* ------------------------------------------------------------------ */

type TimelineDraft = Omit<StoredTimelineEntry, 'id'>;
type CommentDraft = Omit<StoredComment, 'id' | 'reportId'>;

interface ReportSeed {
  id: string;
  referenceNumber: string;
  title: string;
  description: string;
  category: ReportCategory;
  priority: ReportPriority;
  location: ReportLocation;
  attachments?: ReportAttachment[];
  reporterId: string;
  assigneeId?: string;
  timeline: TimelineDraft[];
  comments?: CommentDraft[];
}

/**
 * Builds a self-contained SVG placeholder image as a data URL, so the mock
 * data works offline and never depends on an external image host.
 */
const buildPlaceholderImage = (
  id: string,
  fileName: string,
  label: string,
  accent: string,
  uploadedAt: string,
): ReportAttachment => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">' +
    '<rect width="800" height="600" fill="#e2e8f0"/>' +
    `<rect x="40" y="40" width="720" height="520" rx="24" fill="#f8fafc" stroke="${accent}" stroke-width="6"/>` +
    `<circle cx="400" cy="250" r="90" fill="${accent}" opacity="0.15"/>` +
    `<circle cx="400" cy="250" r="44" fill="none" stroke="${accent}" stroke-width="8"/>` +
    `<text x="400" y="410" font-family="Arial, Helvetica, sans-serif" font-size="38" fill="#0f172a" text-anchor="middle">${label}</text>` +
    '<text x="400" y="460" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#64748b" text-anchor="middle">Attached photo</text>' +
    '</svg>';

  return {
    id,
    fileName,
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    mimeType: 'image/svg+xml',
    sizeBytes: svg.length,
    uploadedAt,
  };
};

const submitted = (createdAt: string, actorId: string): TimelineDraft => ({
  type: 'created',
  title: 'Ticket submitted',
  message: 'Issue ticket was registered in the EngiCare portal.',
  status: 'pending',
  createdAt,
  actorId,
});

const assignedTo = (createdAt: string, actorId: string, technicianId: string): TimelineDraft => ({
  type: 'assigned',
  title: 'Assigned to technician',
  message: `Assigned to ${nameOf(technicianId)}.`,
  createdAt,
  actorId,
});

const statusUpdate = (
  createdAt: string,
  actorId: string,
  status: Exclude<ReportStatus, 'pending'>,
  message: string,
): TimelineDraft => ({
  type: status === 'resolved' ? 'resolved' : status === 'rejected' ? 'rejected' : 'status_changed',
  title: `Status updated to: ${STATUS_LABELS[status]}`,
  message,
  status,
  createdAt,
  actorId,
});

const commentBy = (createdAt: string, authorId: string, message: string): CommentDraft => ({
  authorId,
  message,
  createdAt,
});

const byDate = <T extends { createdAt: string }>(a: T, b: T): number =>
  Date.parse(a.createdAt) - Date.parse(b.createdAt);

const buildReport = (seed: ReportSeed): StoredReport => {
  const timeline: StoredTimelineEntry[] = [...seed.timeline]
    .sort(byDate)
    .map((draft, index) => ({ ...draft, id: `tl-${seed.id}-${index + 1}` }));

  const comments: StoredComment[] = [...(seed.comments ?? [])]
    .sort(byDate)
    .map((draft, index) => ({ ...draft, id: `cm-${seed.id}-${index + 1}`, reportId: seed.id }));

  const firstEntry = timeline[0];
  if (!firstEntry || firstEntry.type !== 'created') {
    throw new Error(`mockReports: report ${seed.id} must start with a "created" timeline entry.`);
  }

  const statusEntries = timeline.filter((entry) => entry.status !== undefined);
  const lastStatusEntry = statusEntries[statusEntries.length - 1];
  const status: ReportStatus = lastStatusEntry?.status ?? 'pending';

  const lastEntryWith = (target: ReportStatus): StoredTimelineEntry | undefined =>
    [...timeline].reverse().find((entry) => entry.status === target);

  const resolvedAt = status === 'resolved' ? (lastEntryWith('resolved')?.createdAt ?? null) : null;
  const rejectionReason = status === 'rejected' ? (lastEntryWith('rejected')?.message ?? null) : null;

  const activityDates = [
    ...timeline.map((entry) => entry.createdAt),
    ...comments.map((comment) => comment.createdAt),
  ];
  const updatedAt = activityDates.reduce(
    (latest, value) => (Date.parse(value) > Date.parse(latest) ? value : latest),
    firstEntry.createdAt,
  );

  return {
    id: seed.id,
    referenceNumber: seed.referenceNumber,
    title: seed.title,
    description: seed.description,
    category: seed.category,
    status,
    priority: seed.priority,
    location: seed.location,
    attachments: seed.attachments ?? [],
    reporterId: seed.reporterId,
    assigneeId: seed.assigneeId ?? null,
    timeline,
    comments,
    rejectionReason,
    createdAt: firstEntry.createdAt,
    updatedAt,
    resolvedAt,
  };
};

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export const mockReports: StoredReport[] = [
  /* 0001 - Sara - resolved */
  buildReport({
    id: 'rep-001',
    referenceNumber: 'ENG-2026-0001',
    title: 'Oscilloscope does not power on',
    description:
      'The oscilloscope on bench 4 in lab E-208 does not power on. The power cable and the outlet were tested with another device and they work, so the fault is inside the unit.',
    category: 'lab_equipment',
    priority: 'medium',
    location: { buildingId: 'electrical', floor: 2, room: 'E-208' },
    reporterId: SARA,
    assigneeId: RANIA,
    timeline: [
      submitted('2026-09-25T09:10:00Z', SARA),
      assignedTo('2026-09-25T13:00:00Z', MONA, RANIA),
      statusUpdate(
        '2026-09-26T09:30:00Z',
        RANIA,
        'in_progress',
        'The device was opened and the power supply is being diagnosed.',
      ),
      statusUpdate(
        '2026-09-29T12:15:00Z',
        RANIA,
        'resolved',
        'The internal power supply fuse was replaced and the device was tested successfully.',
      ),
    ],
    comments: [
      commentBy('2026-09-29T12:20:00Z', RANIA, 'The fuse was replaced. Tell us if it fails again.'),
      commentBy('2026-09-29T15:00:00Z', SARA, 'It works perfectly now. Thank you!'),
    ],
  }),

  /* 0002 - Ahmed - resolved */
  buildReport({
    id: 'rep-002',
    referenceNumber: 'ENG-2026-0002',
    title: 'Wi-Fi disconnections in Lab 402',
    description:
      'The Wi-Fi access point continuously drops the connection every 10 minutes for all desktop nodes during lab sessions.',
    category: 'internet',
    priority: 'medium',
    location: { buildingId: 'computer', floor: 4, room: 'C-402' },
    reporterId: AHMED,
    assigneeId: TARIQ,
    timeline: [
      submitted('2026-09-28T11:00:00Z', AHMED),
      assignedTo('2026-09-29T08:30:00Z', MONA, TARIQ),
      statusUpdate(
        '2026-09-30T19:45:00Z',
        TARIQ,
        'resolved',
        'The faulty network switch was replaced and the router firmware was updated.',
      ),
    ],
    comments: [
      commentBy(
        '2026-09-30T19:46:00Z',
        TARIQ,
        'Replaced faulty network switch and updated router firmware.',
      ),
    ],
  }),

  /* 0003 - Lina - resolved */
  buildReport({
    id: 'rep-003',
    referenceNumber: 'ENG-2026-0003',
    title: 'Power outlets not working in lecture hall A-105',
    description:
      'Most of the power outlets along the side walls of lecture hall A-105 have no power. Students cannot charge their laptops during long lectures.',
    category: 'electrical',
    priority: 'high',
    location: { buildingId: 'main', floor: 1, room: 'A-105' },
    attachments: [
      buildPlaceholderImage(
        'att-003',
        'outlets-a105.svg',
        'Outlets A-105',
        '#16a34a',
        '2026-10-01T09:20:00Z',
      ),
    ],
    reporterId: LINA,
    assigneeId: KHALED,
    timeline: [
      submitted('2026-10-01T09:20:00Z', LINA),
      assignedTo('2026-10-01T10:00:00Z', MONA, KHALED),
      statusUpdate(
        '2026-10-02T08:45:00Z',
        KHALED,
        'in_progress',
        'The electrical panel of the hall is being inspected.',
      ),
      statusUpdate(
        '2026-10-03T13:30:00Z',
        KHALED,
        'resolved',
        'A tripped circuit breaker and a loose junction connection were repaired. All outlets are working.',
      ),
    ],
    comments: [
      commentBy('2026-10-03T13:35:00Z', KHALED, 'All outlets were tested one by one and they work.'),
    ],
  }),

  /* 0004 - Ahmed - in progress */
  buildReport({
    id: 'rep-004',
    referenceNumber: 'ENG-2026-0004',
    title: 'Broken projector in room 201',
    description:
      'The ceiling-mounted projector continuously turns off after 5 minutes of usage and flashes a red warning light. Lectures in this room are disrupted.',
    category: 'it_equipment',
    priority: 'high',
    location: { buildingId: 'main', floor: 2, room: 'B-201' },
    attachments: [
      buildPlaceholderImage(
        'att-004',
        'projector-b201.svg',
        'Projector B-201',
        '#2563eb',
        '2026-10-02T10:15:00Z',
      ),
    ],
    reporterId: AHMED,
    assigneeId: TARIQ,
    timeline: [
      submitted('2026-10-02T10:15:00Z', AHMED),
      statusUpdate(
        '2026-10-02T14:00:00Z',
        MONA,
        'under_review',
        'The facilities team reviewed the report and confirmed the fault.',
      ),
      assignedTo('2026-10-03T08:30:00Z', MONA, TARIQ),
      statusUpdate(
        '2026-10-04T09:20:00Z',
        TARIQ,
        'in_progress',
        'The lamp and the power board are being tested.',
      ),
    ],
    comments: [
      commentBy(
        '2026-10-04T09:25:00Z',
        TARIQ,
        'The lamp is fine. The power board is faulty and a replacement was ordered.',
      ),
      commentBy('2026-10-04T11:00:00Z', AHMED, 'Thanks. Is there another projector available meanwhile?'),
      commentBy(
        '2026-10-04T11:30:00Z',
        MONA,
        'A portable projector is available at the department office.',
      ),
    ],
  }),

  /* 0005 - Omar - resolved */
  buildReport({
    id: 'rep-005',
    referenceNumber: 'ENG-2026-0005',
    title: 'Broken chairs in Lab 101',
    description:
      'Four chairs in Laboratory L-101 have broken backrests and unstable legs. Students are avoiding them, which leaves the lab short of seats during practical sessions.',
    category: 'furniture',
    priority: 'low',
    location: { buildingId: 'labs', floor: 1, room: 'L-101' },
    attachments: [
      buildPlaceholderImage(
        'att-005',
        'lab-chairs.svg',
        'Broken chairs',
        '#16a34a',
        '2026-10-05T11:00:00Z',
      ),
    ],
    reporterId: OMAR,
    assigneeId: RANIA,
    timeline: [
      submitted('2026-10-05T11:00:00Z', OMAR),
      assignedTo('2026-10-06T08:30:00Z', MONA, RANIA),
      statusUpdate('2026-10-07T09:00:00Z', RANIA, 'in_progress', 'Replacement chairs are being prepared.'),
      statusUpdate(
        '2026-10-08T14:45:00Z',
        RANIA,
        'resolved',
        'Four damaged chairs were replaced with new ones from the warehouse.',
      ),
    ],
  }),

  /* 0006 - Ahmed - rejected */
  buildReport({
    id: 'rep-006',
    referenceNumber: 'ENG-2026-0006',
    title: 'Repaint the student lounge walls',
    description:
      'The walls of the student lounge on the first floor look old and dirty. It would be nice to repaint them in a lighter color.',
    category: 'other',
    priority: 'low',
    location: { buildingId: 'main', floor: 1, room: 'Student Lounge' },
    reporterId: AHMED,
    timeline: [
      submitted('2026-10-06T12:30:00Z', AHMED),
      statusUpdate(
        '2026-10-07T09:00:00Z',
        MONA,
        'under_review',
        'The request is being checked against the maintenance scope.',
      ),
      statusUpdate(
        '2026-10-08T10:20:00Z',
        MONA,
        'rejected',
        'Cosmetic repainting is outside the maintenance scope. Please send this request to the Facilities Planning Office.',
      ),
    ],
  }),

  /* 0007 - Sara - under review */
  buildReport({
    id: 'rep-007',
    referenceNumber: 'ENG-2026-0007',
    title: 'Cracked wall plaster in staircase',
    description:
      'A long diagonal crack has appeared in the plaster of the main staircase between the first and second floors, and small pieces are falling off. It should be inspected by a structural engineer.',
    category: 'structural',
    priority: 'high',
    location: { buildingId: 'mechanical', floor: 2, room: 'Staircase S-2' },
    attachments: [
      buildPlaceholderImage(
        'att-007',
        'staircase-crack.svg',
        'Staircase crack',
        '#dc2626',
        '2026-10-12T15:30:00Z',
      ),
    ],
    reporterId: SARA,
    timeline: [
      submitted('2026-10-12T15:30:00Z', SARA),
      statusUpdate(
        '2026-10-13T09:10:00Z',
        MONA,
        'under_review',
        'A structural engineer will inspect the crack this week.',
      ),
    ],
    comments: [
      commentBy(
        '2026-10-13T09:15:00Z',
        MONA,
        'Please avoid leaning on the wall near the crack until the inspection is done.',
      ),
    ],
  }),

  /* 0008 - Yousef - in progress */
  buildReport({
    id: 'rep-008',
    referenceNumber: 'ENG-2026-0008',
    title: 'Wi-Fi keeps disconnecting in the library',
    description:
      'The Wi-Fi connection in the Engineering Library reading area drops every few minutes. Students cannot access online resources or submit assignments reliably.',
    category: 'internet',
    priority: 'high',
    location: { buildingId: 'library', floor: 1, room: 'LIB-1 Reading Area' },
    reporterId: YOUSEF,
    assigneeId: TARIQ,
    timeline: [
      submitted('2026-10-13T10:45:00Z', YOUSEF),
      assignedTo('2026-10-13T11:30:00Z', MONA, TARIQ),
      statusUpdate(
        '2026-10-14T09:00:00Z',
        TARIQ,
        'in_progress',
        'The access points of the reading area are being checked.',
      ),
    ],
    comments: [
      commentBy(
        '2026-10-15T15:10:00Z',
        TARIQ,
        'Two access points were found overloaded. A firmware update and a channel change are planned for tonight.',
      ),
    ],
  }),

  /* 0009 - Yousef - in progress */
  buildReport({
    id: 'rep-009',
    referenceNumber: 'ENG-2026-0009',
    title: 'Air conditioning not cooling in computer lab',
    description:
      'The air conditioning unit in computer lab C-305 blows warm air. The room temperature reaches around 32°C in the afternoon and the computers are overheating.',
    category: 'hvac',
    priority: 'medium',
    location: { buildingId: 'computer', floor: 3, room: 'C-305' },
    reporterId: YOUSEF,
    assigneeId: RANIA,
    timeline: [
      submitted('2026-10-14T12:20:00Z', YOUSEF),
      assignedTo('2026-10-15T08:15:00Z', MONA, RANIA),
      statusUpdate(
        '2026-10-15T10:30:00Z',
        RANIA,
        'in_progress',
        'The cooling unit is being inspected.',
      ),
    ],
    comments: [
      commentBy(
        '2026-10-16T11:00:00Z',
        RANIA,
        'The refrigerant level is low. A gas refill is scheduled for this week.',
      ),
    ],
  }),

  /* 0010 - Omar - pending */
  buildReport({
    id: 'rep-010',
    referenceNumber: 'ENG-2026-0010',
    title: 'Broken door lock in room M-110',
    description:
      'The door lock of room M-110 is broken and the door cannot be locked. Expensive equipment is stored in the room, so it is a security concern.',
    category: 'safety',
    priority: 'medium',
    location: { buildingId: 'mechanical', floor: 1, room: 'M-110' },
    reporterId: OMAR,
    timeline: [submitted('2026-10-15T13:50:00Z', OMAR)],
  }),

  /* 0011 - Ahmed - pending */
  buildReport({
    id: 'rep-011',
    referenceNumber: 'ENG-2026-0011',
    title: 'Cracked floor tiles at the library entrance',
    description:
      'Several floor tiles at the main entrance of the Engineering Library are cracked and lifting at the edges. People may trip on them.',
    category: 'structural',
    priority: 'low',
    location: { buildingId: 'library', floor: 0, room: 'Entrance Hall' },
    reporterId: AHMED,
    timeline: [submitted('2026-10-15T14:10:00Z', AHMED)],
  }),

  /* 0012 - Yousef - pending */
  buildReport({
    id: 'rep-012',
    referenceNumber: 'ENG-2026-0012',
    title: 'Flickering lights in first floor corridor',
    description:
      'Several fluorescent lights in the corridor outside room E-110 flicker continuously. It is distracting and causes headaches for people working nearby.',
    category: 'electrical',
    priority: 'medium',
    location: { buildingId: 'electrical', floor: 1, room: 'E-110 Corridor' },
    reporterId: YOUSEF,
    timeline: [submitted('2026-10-16T10:05:00Z', YOUSEF)],
  }),

  /* 0013 - Sara - in progress */
  buildReport({
    id: 'rep-013',
    referenceNumber: 'ENG-2026-0013',
    title: 'Water leak in ground floor corridor',
    description:
      'Water is dripping from the ceiling near the entrance of the Civil Engineering Building and forming a puddle on the floor. The tiles are slippery and students are at risk of falling.',
    category: 'plumbing',
    priority: 'high',
    location: { buildingId: 'civil', floor: 0, room: 'G-012 Corridor' },
    attachments: [
      buildPlaceholderImage(
        'att-013-1',
        'corridor-leak.svg',
        'Corridor leak',
        '#2563eb',
        '2026-10-17T09:40:00Z',
      ),
      buildPlaceholderImage(
        'att-013-2',
        'ceiling-stain.svg',
        'Ceiling stain',
        '#2563eb',
        '2026-10-17T09:41:00Z',
      ),
    ],
    reporterId: SARA,
    assigneeId: KHALED,
    timeline: [
      submitted('2026-10-17T09:40:00Z', SARA),
      assignedTo('2026-10-17T10:05:00Z', MONA, KHALED),
      statusUpdate(
        '2026-10-17T13:20:00Z',
        KHALED,
        'in_progress',
        'The leak was located above the corridor ceiling.',
      ),
    ],
    comments: [
      commentBy(
        '2026-10-18T09:10:00Z',
        KHALED,
        'Water supply to the upper floor was shut off. A damaged pipe joint was found and a replacement part has been ordered.',
      ),
    ],
  }),

  /* 0014 - Ahmed - under review, urgent */
  buildReport({
    id: 'rep-014',
    referenceNumber: 'ENG-2026-0014',
    title: 'Water leak near restroom, 2nd floor',
    description:
      'Water is constantly leaking from the pipe joint under the sink, pooling into the hallway floor.',
    category: 'plumbing',
    priority: 'urgent',
    location: { buildingId: 'main', floor: 2, room: 'Restroom 2F' },
    reporterId: AHMED,
    timeline: [
      submitted('2026-10-18T16:40:00Z', AHMED),
      statusUpdate(
        '2026-10-18T17:05:00Z',
        MONA,
        'under_review',
        'Marked as urgent. A technician will inspect the leak as soon as possible.',
      ),
    ],
    comments: [
      commentBy(
        '2026-10-18T17:10:00Z',
        MONA,
        'Please keep away from the wet area. A warning sign has been placed.',
      ),
    ],
  }),

  /* 0015 - Lina - pending, urgent */
  buildReport({
    id: 'rep-015',
    referenceNumber: 'ENG-2026-0015',
    title: 'Projector not working in lecture hall',
    description:
      'The ceiling projector in lecture hall B-204 does not turn on. The power light stays off even after checking the remote batteries and the wall switch. A lecture scheduled for tomorrow morning needs it.',
    category: 'it_equipment',
    priority: 'urgent',
    location: { buildingId: 'main', floor: 2, room: 'B-204' },
    attachments: [
      buildPlaceholderImage(
        'att-015',
        'projector-b204.svg',
        'Projector B-204',
        '#dc2626',
        '2026-10-18T08:15:00Z',
      ),
    ],
    reporterId: LINA,
    timeline: [submitted('2026-10-18T08:15:00Z', LINA)],
  }),

  /* 0016 - Lina - in progress, urgent */
  buildReport({
    id: 'rep-016',
    referenceNumber: 'ENG-2026-0016',
    title: 'Gas smell near chemistry laboratory',
    description:
      'A strong gas smell is coming from the storage room next to laboratory CH-003. The smell is noticeable from the corridor. Please check it immediately.',
    category: 'safety',
    priority: 'urgent',
    location: { buildingId: 'chemical', floor: 0, room: 'CH-003' },
    reporterId: LINA,
    assigneeId: KHALED,
    timeline: [
      submitted('2026-10-19T07:30:00Z', LINA),
      assignedTo('2026-10-19T07:42:00Z', MONA, KHALED),
      statusUpdate(
        '2026-10-19T07:55:00Z',
        KHALED,
        'in_progress',
        'The area was cleared and the inspection started.',
      ),
    ],
    comments: [
      commentBy(
        '2026-10-19T08:20:00Z',
        KHALED,
        'The area was cleared and ventilated. Gas supply valves are being inspected before access is reopened.',
      ),
    ],
  }),
];