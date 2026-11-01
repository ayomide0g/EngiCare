/**
 * EngiCare - Auth service (mock implementation)
 * ------------------------------------------------------------------
 * The ONLY layer the UI is allowed to use to sign users in, register them
 * or restore a session. Every function is asynchronous and simulates
 * network latency.
 *
 * To connect the university identity provider later (SSO / LDAP / Azure
 * AD), keep the exported function names and signatures and replace the
 * bodies with real calls. No component needs to change.
 *
 * SECURITY NOTE: comparing passwords in the browser is acceptable ONLY for
 * this demo. A real backend verifies credentials on the server, and the
 * browser never receives passwords.
 */

import {
  ALLOWED_EMAIL_DOMAINS,
  EMAIL_DOMAIN_BY_ROLE,
  isEmailAllowedForRole,
  isUniversityEmail,
  mockAccounts,
} from '../data/mockAccounts';
import type { MockAccount } from '../data/mockAccounts';
import type {
  AuthError,
  AuthSession,
  AuthUser,
  LoginCredentials,
  RegisterInput,
} from '../types/auth.types';
import {
  PORTAL_LABELS,
  ROLE_PORTALS,
  isDepartmentId,
  isLoginPortal,
  isRegistrableRole,
} from '../types/auth.types';

/* ------------------------------------------------------------------ */
/* Validation rules (shared with the sign-in and register forms)       */
/* ------------------------------------------------------------------ */

export const AUTH_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 80,
  EMAIL_MAX_LENGTH: 120,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
} as const;

export interface PasswordRequirement {
  id: 'length' | 'uppercase' | 'lowercase' | 'number';
  label: string;
  isMet: (password: string) => boolean;
}

/** Shown as a live checklist under the password field of the register form. */
export const PASSWORD_REQUIREMENTS: readonly PasswordRequirement[] = [
  {
    id: 'length',
    label: `At least ${AUTH_VALIDATION.PASSWORD_MIN_LENGTH} characters`,
    isMet: (password) => password.length >= AUTH_VALIDATION.PASSWORD_MIN_LENGTH,
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    isMet: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    isMet: (password) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'One number',
    isMet: (password) => /\d/.test(password),
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^\p{L}[\p{L}\s.'’-]*$/u;

const ALLOWED_DOMAINS_TEXT = ALLOWED_EMAIL_DOMAINS.map((domain) => `@${domain}`).join(' or ');

/* ------------------------------------------------------------------ */
/* Internal state & helpers                                            */
/* ------------------------------------------------------------------ */

const LATENCY_MIN_MS = 450;
const LATENCY_MAX_MS = 900;

const DEFAULT_SESSION_MS = 8 * 60 * 60 * 1000;
const REMEMBER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

const SESSION_STORAGE_KEY = 'engicare.session';

/** In-memory "users table". New registrations live here until the page is reloaded. */
const accountsStore: MockAccount[] = mockAccounts.map((account) => ({
  user: { ...account.user },
  password: account.password,
}));

const delay = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const simulateLatency = (): Promise<void> =>
  delay(LATENCY_MIN_MS + Math.random() * (LATENCY_MAX_MS - LATENCY_MIN_MS));

const createAuthError = (
  code: AuthError['code'],
  message: string,
  fieldErrors?: AuthError['fieldErrors'],
): AuthError => ({
  code,
  message,
  ...(fieldErrors ? { fieldErrors } : {}),
});

/** Type guard used by UI catch blocks. */
export const isAuthError = (value: unknown): value is AuthError =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  'message' in value &&
  typeof (value as { message: unknown }).message === 'string';

/** Converts anything thrown into the normalized AuthError shape. */
export const toAuthError = (error: unknown): AuthError => {
  if (isAuthError(error)) return error;
  if (error instanceof Error) return createAuthError('UNKNOWN', error.message);
  return createAuthError('UNKNOWN', 'Something went wrong. Please try again.');
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const normalizeName = (name: string): string => name.trim().replace(/\s+/g, ' ');

const findAccountByEmail = (email: string): MockAccount | undefined => {
  const normalized = normalizeEmail(email);
  return accountsStore.find((account) => account.user.email.toLowerCase() === normalized);
};

const generateToken = (): string => {
  const cryptoApi = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `mock-${cryptoApi.randomUUID()}`;
  }
  return `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const buildSession = (user: AuthUser, rememberMe: boolean): AuthSession => ({
  user: { ...user },
  token: generateToken(),
  expiresAt: new Date(
    Date.now() + (rememberMe ? REMEMBER_SESSION_MS : DEFAULT_SESSION_MS),
  ).toISOString(),
});

/* ------------------------------------------------------------------ */
/* Session persistence (localStorage when "remember me", else session) */
/* ------------------------------------------------------------------ */

type StorageKind = 'local' | 'session';

const getStorage = (kind: StorageKind): Storage | null => {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    /* Storage can be blocked (private mode, strict browser settings). */
    return null;
  }
};

const removeFromStorage = (kind: StorageKind): void => {
  try {
    getStorage(kind)?.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* Nothing else to do: the entry cannot be removed. */
  }
};

const clearStoredSession = (): void => {
  removeFromStorage('local');
  removeFromStorage('session');
};

const persistSession = (session: AuthSession, rememberMe: boolean): void => {
  clearStoredSession();
  try {
    getStorage(rememberMe ? 'local' : 'session')?.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(session),
    );
  } catch {
    /* The session still works for this page load, it just will not survive a reload. */
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Validates the shape of a value read back from storage before trusting it. */
const isAuthSession = (value: unknown): value is AuthSession => {
  if (!isRecord(value) || !isRecord(value.user)) return false;

  const { user } = value;

  return (
    typeof value.token === 'string' &&
    typeof value.expiresAt === 'string' &&
    !Number.isNaN(Date.parse(value.expiresAt)) &&
    typeof user.id === 'string' &&
    typeof user.fullName === 'string' &&
    typeof user.email === 'string' &&
    typeof user.role === 'string' &&
    Object.prototype.hasOwnProperty.call(ROLE_PORTALS, user.role) &&
    isLoginPortal(user.portal) &&
    isDepartmentId(user.department)
  );
};

const readStoredSession = (): AuthSession | null => {
  const kinds: StorageKind[] = ['local', 'session'];

  for (const kind of kinds) {
    const storage = getStorage(kind);
    if (!storage) continue;

    try {
      const raw = storage.getItem(SESSION_STORAGE_KEY);
      if (!raw) continue;

      const parsed: unknown = JSON.parse(raw);
      if (isAuthSession(parsed) && Date.parse(parsed.expiresAt) > Date.now()) {
        return parsed;
      }
    } catch {
      /* Corrupted entry: fall through and remove it. */
    }

    removeFromStorage(kind);
  }

  return null;
};

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Validates the sign-in form. Keys: email, password, portal.
 * An empty object means the payload is valid. Synchronous, so the form can
 * also call it for instant feedback.
 */
export const validateLoginCredentials = (
  credentials: LoginCredentials,
): Partial<Record<string, string>> => {
  const errors: Partial<Record<string, string>> = {};

  const email = credentials.email.trim();
  if (email.length === 0) {
    errors.email = 'Enter your university email.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  } else if (!isUniversityEmail(email)) {
    errors.email = `Use your university email (${ALLOWED_DOMAINS_TEXT}).`;
  }

  if (credentials.password.length === 0) {
    errors.password = 'Enter your password.';
  }

  if (!isLoginPortal(credentials.portal)) {
    errors.portal = 'Choose how you want to sign in.';
  }

  return errors;
};

/**
 * Validates the registration form.
 * Keys: fullName, email, password, confirmPassword, role, department.
 */
export const validateRegisterInput = (input: RegisterInput): Partial<Record<string, string>> => {
  const errors: Partial<Record<string, string>> = {};
  const rules = AUTH_VALIDATION;

  const fullName = normalizeName(input.fullName);
  if (fullName.length < rules.NAME_MIN_LENGTH) {
    errors.fullName = `Enter your full name (at least ${rules.NAME_MIN_LENGTH} characters).`;
  } else if (fullName.length > rules.NAME_MAX_LENGTH) {
    errors.fullName = `Name must be ${rules.NAME_MAX_LENGTH} characters or fewer.`;
  } else if (!NAME_PATTERN.test(fullName)) {
    errors.fullName = 'Name can only contain letters, spaces and . ’ -';
  } else if (fullName.split(' ').length < 2) {
    errors.fullName = 'Enter your first and last name.';
  }

  if (!isRegistrableRole(input.role)) {
    errors.role = 'Select your role.';
  }

  const email = input.email.trim();
  if (email.length === 0) {
    errors.email = 'Enter your university email.';
  } else if (email.length > rules.EMAIL_MAX_LENGTH) {
    errors.email = `Email must be ${rules.EMAIL_MAX_LENGTH} characters or fewer.`;
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  } else if (!isUniversityEmail(email)) {
    errors.email = `Use your university email (${ALLOWED_DOMAINS_TEXT}).`;
  } else if (isRegistrableRole(input.role) && !isEmailAllowedForRole(email, input.role)) {
    const domain = EMAIL_DOMAIN_BY_ROLE[input.role];
    errors.email =
      input.role === 'student'
        ? `Students must register with their @${domain} email.`
        : `Faculty members and staff must register with their @${domain} email.`;
  }

  if (input.password.length === 0) {
    errors.password = 'Create a password.';
  } else if (input.password.length > rules.PASSWORD_MAX_LENGTH) {
    errors.password = `Password must be ${rules.PASSWORD_MAX_LENGTH} characters or fewer.`;
  } else if (PASSWORD_REQUIREMENTS.some((requirement) => !requirement.isMet(input.password))) {
    errors.password = `Use at least ${rules.PASSWORD_MIN_LENGTH} characters with an uppercase letter, a lowercase letter and a number.`;
  }

  if (input.confirmPassword.length === 0) {
    errors.confirmPassword = 'Repeat your password.';
  } else if (input.confirmPassword !== input.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!isDepartmentId(input.department)) {
    errors.department = 'Select your department.';
  }

  return errors;
};

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Signs a user in.
 * Throws:
 *  - VALIDATION_ERROR      with `fieldErrors` when the form is invalid
 *  - INVALID_CREDENTIALS   when the email or password is wrong (the message
 *                          never says which one, on purpose)
 *  - PORTAL_MISMATCH       when the credentials are right but "Login As Role"
 *                          does not match the account type
 */
export const login = async (credentials: LoginCredentials): Promise<AuthSession> => {
  await simulateLatency();

  const fieldErrors = validateLoginCredentials(credentials);
  if (Object.keys(fieldErrors).length > 0) {
    throw createAuthError(
      'VALIDATION_ERROR',
      'Please fix the highlighted fields and try again.',
      fieldErrors,
    );
  }

  const account = findAccountByEmail(credentials.email);
  if (!account || account.password !== credentials.password) {
    throw createAuthError(
      'INVALID_CREDENTIALS',
      'Incorrect email or password. Check your details and try again.',
    );
  }

  /* Only checked after the credentials are proven, so the message does not
     reveal whether an email exists to someone who does not know the password. */
  if (account.user.portal !== credentials.portal) {
    throw createAuthError(
      'PORTAL_MISMATCH',
      `This account signs in as “${PORTAL_LABELS[account.user.portal]}”. Change “Login As Role” and try again.`,
      { portal: `Choose “${PORTAL_LABELS[account.user.portal]}” for this account.` },
    );
  }

  const session = buildSession(account.user, credentials.rememberMe);
  persistSession(session, credentials.rememberMe);
  return session;
};

/**
 * Creates a new student / faculty / staff account and signs it in.
 * Throws VALIDATION_ERROR (with `fieldErrors`) or EMAIL_TAKEN.
 */
export const register = async (input: RegisterInput): Promise<AuthSession> => {
  await simulateLatency();

  const fieldErrors = validateRegisterInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    throw createAuthError(
      'VALIDATION_ERROR',
      'Please fix the highlighted fields and try again.',
      fieldErrors,
    );
  }

  if (findAccountByEmail(input.email)) {
    throw createAuthError('EMAIL_TAKEN', 'An account with this email already exists.', {
      email: 'An account with this email already exists. Sign in instead.',
    });
  }

  const user: AuthUser = {
    id: `usr-${Date.now()}`,
    fullName: normalizeName(input.fullName),
    email: normalizeEmail(input.email),
    role: input.role,
    portal: ROLE_PORTALS[input.role],
    department: input.department,
  };

  accountsStore.push({ user, password: input.password });

  const session = buildSession(user, false);
  persistSession(session, false);
  return session;
};

/** Ends the current session. */
export const logout = async (): Promise<void> => {
  await delay(200);
  clearStoredSession();
};

/**
 * Returns the stored session, or null when there is none or it has expired.
 * Called once when the app starts, to keep the user signed in after a reload.
 */
export const getSession = async (): Promise<AuthSession | null> => readStoredSession();

/* ------------------------------------------------------------------ */
/* Service object (convenient single import for the UI)                */
/* ------------------------------------------------------------------ */

export const authService = {
  login,
  register,
  logout,
  getSession,
  validateLoginCredentials,
  validateRegisterInput,
} as const;