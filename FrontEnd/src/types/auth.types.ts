/**
 * EngiCare - Authentication domain types
 * ------------------------------------------------------------------
 * Single source of truth for every data shape used by the sign-in,
 * registration and session layers. Components, contexts and services
 * import from this file only, so replacing the mock auth service with
 * the university's real identity provider needs no UI changes.
 */

import type { ReportUser } from './report.types';

/* ------------------------------------------------------------------ */
/* Roles and portals                                                   */
/* ------------------------------------------------------------------ */

/** Every role an account can have (same union used by reports). */
export type UserRole = ReportUser['role'];

/**
 * The two doors of the system, chosen on the sign-in form ("Login As Role").
 *  - user   students, faculty members and staff who report issues
 *  - admin  facilities administrators and technicians who manage them
 */
export const LOGIN_PORTALS = ['user', 'admin'] as const;
export type LoginPortal = (typeof LOGIN_PORTALS)[number];

export const PORTAL_LABELS: Record<LoginPortal, string> = {
  user: 'Student / Faculty Staff',
  admin: 'Facilities Admin / Technician',
};

/** The portal each role is allowed to sign in through. */
export const ROLE_PORTALS: Record<UserRole, LoginPortal> = {
  student: 'user',
  faculty_member: 'user',
  staff: 'user',
  technician: 'admin',
  admin: 'admin',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  faculty_member: 'Faculty member',
  staff: 'Staff',
  technician: 'Technician',
  admin: 'Administrator',
};

/** Roles a person can pick for themselves on the registration form. */
export type RegistrableRole = Extract<UserRole, 'student' | 'faculty_member' | 'staff'>;

export const REGISTRABLE_ROLES: readonly RegistrableRole[] = [
  'student',
  'faculty_member',
  'staff',
];

/* ------------------------------------------------------------------ */
/* Departments                                                         */
/* ------------------------------------------------------------------ */

export const DEPARTMENT_IDS = [
  'civil',
  'mechanical',
  'electrical',
  'computer',
  'chemical',
  'general',
] as const;
export type DepartmentId = (typeof DEPARTMENT_IDS)[number];

export const DEPARTMENT_LABELS: Record<DepartmentId, string> = {
  civil: 'Civil Engineering',
  mechanical: 'Mechanical Engineering',
  electrical: 'Electrical Engineering',
  computer: 'Computer Engineering',
  chemical: 'Chemical Engineering',
  general: 'General / Administration',
};

/* ------------------------------------------------------------------ */
/* Entities                                                            */
/* ------------------------------------------------------------------ */

/** The signed-in user. Extends the lightweight user shown on reports. */
export interface AuthUser extends ReportUser {
  /** Which portal this account belongs to. */
  portal: LoginPortal;
  department: DepartmentId;
}

/** What the backend returns after a successful sign-in or registration. */
export interface AuthSession {
  user: AuthUser;
  /** Opaque access token. The real backend decides its format. */
  token: string;
  /** ISO 8601 timestamp after which the session is no longer valid. */
  expiresAt: string;
}

/* ------------------------------------------------------------------ */
/* Input shapes (what the UI sends to the service)                     */
/* ------------------------------------------------------------------ */

/** Payload of the sign-in form. */
export interface LoginCredentials {
  /** University email address. */
  email: string;
  password: string;
  /** The "Login As Role" choice. Must match the account's own portal. */
  portal: LoginPortal;
  /** Keep the session after the browser is closed. */
  rememberMe: boolean;
}

/** Payload of the registration form. */
export interface RegisterInput {
  fullName: string;
  /** University email address. */
  email: string;
  password: string;
  confirmPassword: string;
  role: RegistrableRole;
  department: DepartmentId;
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'PORTAL_MISMATCH'
  | 'EMAIL_TAKEN'
  | 'VALIDATION_ERROR'
  | 'SESSION_EXPIRED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

/** Normalized error shape thrown by the auth service. */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  /** Per-field messages. Keys match the form field names. */
  fieldErrors?: Partial<Record<string, string>>;
}

/* ------------------------------------------------------------------ */
/* Helpers and type guards                                             */
/* ------------------------------------------------------------------ */

/** True when the user may manage reports (assign, change status, reject). */
export const hasAdminAccess = (user: Pick<AuthUser, 'portal'>): boolean =>
  user.portal === 'admin';

export const isLoginPortal = (value: unknown): value is LoginPortal =>
  typeof value === 'string' && (LOGIN_PORTALS as readonly string[]).includes(value);

export const isRegistrableRole = (value: unknown): value is RegistrableRole =>
  typeof value === 'string' && (REGISTRABLE_ROLES as readonly string[]).includes(value);

export const isDepartmentId = (value: unknown): value is DepartmentId =>
  typeof value === 'string' && (DEPARTMENT_IDS as readonly string[]).includes(value);