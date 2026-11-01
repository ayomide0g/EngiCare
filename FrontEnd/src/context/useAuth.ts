import { createContext, useContext } from 'react';

import type {
  AuthUser,
  LoginCredentials,
  RegisterInput,
} from '../types/auth.types';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/**
 *  - loading          the stored session is still being restored on startup
 *  - authenticated    a user is signed in
 *  - unauthenticated  nobody is signed in
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  /** The signed-in user, or null. */
  user: AuthUser | null;
  status: AuthStatus;
  /** True when the signed-in user belongs to the admin portal (admin / technician). */
  isAdmin: boolean;
  /** True when the last session ended because it expired, so the sign-in page can explain why. */
  sessionExpired: boolean;
  /** Signs in. Rejects with an AuthError (use `toAuthError` from auth.service). */
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  /** Creates an account and signs it in. Rejects with an AuthError. */
  register: (input: RegisterInput) => Promise<AuthUser>;
  /** Ends the current session. */
  logout: () => Promise<void>;
  /** Hides the "session expired" notice. */
  dismissSessionExpired: () => void;
}

/* ------------------------------------------------------------------ */
/* Context and hooks                                                   */
/* ------------------------------------------------------------------ */

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Access to the auth state and actions. Must be used under <AuthProvider>. */
export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return value;
};

/**
 * Returns the signed-in user, never null.
 * Use it only in components that are rendered after sign-in (pages, header...).
 */
export const useCurrentUser = (): AuthUser => {
  const { user } = useAuth();
  if (user === null) {
    throw new Error('useCurrentUser must be used while a user is signed in.');
  }
  return user;
};