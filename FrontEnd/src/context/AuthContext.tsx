import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { authService } from '../services/auth.service';
import type { AuthSession, AuthUser, LoginCredentials, RegisterInput } from '../types/auth.types';
import { hasAdminAccess } from '../types/auth.types';
import { AuthContext } from './useAuth';
import type { AuthContextValue, AuthStatus } from './useAuth';

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Browsers store a setTimeout delay in a signed 32-bit integer (about
 * 24.8 days). A "remember me" session lasts 30 days, so the expiry timer
 * waits in chunks of at most this many milliseconds.
 */
const MAX_TIMEOUT_MS = 2_000_000_000;

export default function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [sessionExpired, setSessionExpired] = useState(false);

  /* Restore the stored session once, when the app starts. */
  useEffect(() => {
    let isCancelled = false;

    const restore = async () => {
      try {
        const stored = await authService.getSession();
        if (isCancelled) return;

        setSession(stored);
        setStatus(stored ? 'authenticated' : 'unauthenticated');
      } catch {
        if (isCancelled) return;

        setSession(null);
        setStatus('unauthenticated');
      }
    };

    void restore();

    return () => {
      isCancelled = true;
    };
  }, []);

  /* Sign the user out automatically when the session expires. */
  const expiresAt = session?.expiresAt ?? null;

  useEffect(() => {
    if (expiresAt === null) return undefined;

    const expiryTime = Date.parse(expiresAt);
    let timer: number | undefined;

    function schedule() {
      const remaining = expiryTime - Date.now();
      timer = window.setTimeout(handleTimer, Math.max(0, Math.min(remaining, MAX_TIMEOUT_MS)));
    }

    function handleTimer() {
      if (expiryTime - Date.now() > 0) {
        /* Woke up early (long sessions are waited for in chunks): keep waiting. */
        schedule();
        return;
      }

      void authService.logout();
      setSession(null);
      setStatus('unauthenticated');
      setSessionExpired(true);
    }

    schedule();

    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthUser> => {
    const newSession = await authService.login(credentials);

    setSession(newSession);
    setStatus('authenticated');
    setSessionExpired(false);

    return newSession.user;
  }, []);

  const register = useCallback(async (input: RegisterInput): Promise<AuthUser> => {
    const newSession = await authService.register(input);

    setSession(newSession);
    setStatus('authenticated');
    setSessionExpired(false);

    return newSession.user;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } finally {
      /* The local state is cleared even if the service call fails. */
      setSession(null);
      setStatus('unauthenticated');
      setSessionExpired(false);
    }
  }, []);

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), []);

  const user = session?.user ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAdmin: user !== null && hasAdminAccess(user),
      sessionExpired,
      login,
      register,
      logout,
      dismissSessionExpired,
    }),
    [user, status, sessionExpired, login, register, logout, dismissSessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}