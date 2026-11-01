/**
 * EngiCare - Mock accounts
 * ------------------------------------------------------------------
 * Seed accounts used by the mock auth service (auth.service.ts).
 * UI components must NEVER import this file directly; they talk to the
 * auth layer only.
 *
 * SECURITY NOTE: passwords are stored in plain text here for demo
 * purposes ONLY. A real system never stores or compares passwords in the
 * browser: the university identity provider (SSO / LDAP / Azure AD)
 * verifies them on the server and returns a session.
 *
 * The ids and names match the users referenced by the reports in
 * mockReports.ts, so every report belongs to a real account.
 */

import type { AuthUser, DepartmentId, LoginPortal, UserRole } from '../types/auth.types';
import { ROLE_PORTALS } from '../types/auth.types';

/* ------------------------------------------------------------------ */
/* University email policy                                             */
/* ------------------------------------------------------------------ */

/** Students sign in with their student mailbox. */
export const STUDENT_EMAIL_DOMAIN = 'posta.mu.edu.tr';

/** Faculty members, staff, technicians and administrators use the main domain. */
export const STAFF_EMAIL_DOMAIN = 'mu.edu.tr';

/**
 * The email domain each role must use. Change a value here and sign-in,
 * registration and the demo accounts follow automatically.
 */
export const EMAIL_DOMAIN_BY_ROLE: Record<UserRole, string> = {
  student: STUDENT_EMAIL_DOMAIN,
  faculty_member: STAFF_EMAIL_DOMAIN,
  staff: STAFF_EMAIL_DOMAIN,
  technician: STAFF_EMAIL_DOMAIN,
  admin: STAFF_EMAIL_DOMAIN,
};

/** Every domain the system accepts. */
export const ALLOWED_EMAIL_DOMAINS: readonly string[] = [STUDENT_EMAIL_DOMAIN, STAFF_EMAIL_DOMAIN];

/** Examples shown as the placeholder of the email field, per sign-in portal. */
export const EMAIL_PLACEHOLDER_BY_PORTAL: Record<LoginPortal, string> = {
  user: `student@${STUDENT_EMAIL_DOMAIN}`,
  admin: `admin@${STAFF_EMAIL_DOMAIN}`,
};

/** Returns the lower-cased domain of an email, or an empty string when there is none. */
export const getEmailDomain = (email: string): string => {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');
  return atIndex === -1 ? '' : normalized.slice(atIndex + 1);
};

/**
 * True when the email belongs to one of the university domains.
 * The match is EXACT: "posta.mu.edu.tr" and "mu.edu.tr" are different
 * domains, and unknown sub-domains such as "evil.mu.edu.tr" are rejected.
 */
export const isUniversityEmail = (email: string): boolean =>
  ALLOWED_EMAIL_DOMAINS.includes(getEmailDomain(email));

/** True when the email uses the domain that the given role must use. */
export const isEmailAllowedForRole = (email: string, role: UserRole): boolean =>
  getEmailDomain(email) === EMAIL_DOMAIN_BY_ROLE[role];

/* ------------------------------------------------------------------ */
/* Account model                                                       */
/* ------------------------------------------------------------------ */

export interface MockAccount {
  user: AuthUser;
  /** Plain text on purpose. Demo data only, see the note above. */
  password: string;
}

const buildUser = (
  id: string,
  fullName: string,
  localPart: string,
  role: UserRole,
  department: DepartmentId,
): AuthUser => ({
  id,
  fullName,
  email: `${localPart}@${EMAIL_DOMAIN_BY_ROLE[role]}`,
  role,
  department,
  portal: ROLE_PORTALS[role],
});

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

const AHMED = buildUser('usr-001', 'Ahmed Khalil', 'ahmed.khalil', 'student', 'computer');

const SARA = buildUser('usr-002', 'Sara Hassan', 'sara.hassan', 'student', 'civil');

const OMAR = buildUser('usr-003', 'Omar Nasser', 'omar.nasser', 'student', 'mechanical');

const LINA = buildUser(
  'usr-004',
  'Dr. Lina Mansour',
  'lina.mansour',
  'faculty_member',
  'chemical',
);

const YOUSEF = buildUser('usr-005', 'Yousef Haddad', 'yousef.haddad', 'staff', 'general');

const KHALED = buildUser(
  'tech-001',
  'Khaled Mahmoud',
  'khaled.mahmoud',
  'technician',
  'electrical',
);

const RANIA = buildUser('tech-002', 'Rania Saleh', 'rania.saleh', 'technician', 'mechanical');

const TARIQ = buildUser('tech-003', 'Tariq Aziz', 'tariq.aziz', 'technician', 'computer');

const MONA = buildUser('adm-001', 'Dr. Mona Farouk', 'mona.farouk', 'admin', 'general');

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

const STUDENT_PASSWORD = 'Student@123';
const FACULTY_PASSWORD = 'Faculty@123';
const STAFF_PASSWORD = 'Staff@123';
const TECHNICIAN_PASSWORD = 'Tech@1234';
const ADMIN_PASSWORD = 'Admin@123';

export const mockAccounts: readonly MockAccount[] = [
  { user: AHMED, password: STUDENT_PASSWORD },
  { user: SARA, password: STUDENT_PASSWORD },
  { user: OMAR, password: STUDENT_PASSWORD },
  { user: LINA, password: FACULTY_PASSWORD },
  { user: YOUSEF, password: STAFF_PASSWORD },
  { user: KHALED, password: TECHNICIAN_PASSWORD },
  { user: RANIA, password: TECHNICIAN_PASSWORD },
  { user: TARIQ, password: TECHNICIAN_PASSWORD },
  { user: MONA, password: ADMIN_PASSWORD },
];

/* ------------------------------------------------------------------ */
/* Quick demo access (the "Student Demo" / "Admin Demo" buttons)       */
/* ------------------------------------------------------------------ */

export interface DemoCredentials {
  email: string;
  password: string;
  /** The "Login As Role" value that matches this account. */
  portal: LoginPortal;
}

export const DEMO_CREDENTIALS: Record<LoginPortal, DemoCredentials> = {
  user: { email: AHMED.email, password: STUDENT_PASSWORD, portal: 'user' },
  admin: { email: MONA.email, password: ADMIN_PASSWORD, portal: 'admin' },
};