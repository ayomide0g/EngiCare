import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import {
  ArrowRight,
  Building2,
  CircleAlert,
  CircleCheck,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { SelectOption } from '../components/ui/Select';
import { useAuth } from '../context/useAuth';
import {
  DEMO_CREDENTIALS,
  EMAIL_PLACEHOLDER_BY_PORTAL,
  STAFF_EMAIL_DOMAIN,
  STUDENT_EMAIL_DOMAIN,
} from '../data/mockAccounts';
import { toAuthError, validateLoginCredentials } from '../services/auth.service';
import type { LoginPortal } from '../types/auth.types';
import { LOGIN_PORTALS, PORTAL_LABELS, isLoginPortal } from '../types/auth.types';

export interface LoginPageProps {
  /** Opens the registration page. */
  onRegister: () => void;
}

/* ------------------------------------------------------------------ */
/* Static data                                                         */
/* ------------------------------------------------------------------ */

const PORTAL_OPTIONS: SelectOption[] = LOGIN_PORTALS.map((value) => ({
  value,
  label: PORTAL_LABELS[value],
}));

interface DemoButtonConfig {
  portal: LoginPortal;
  label: string;
  icon: typeof UserRound;
}

const DEMO_BUTTONS: readonly DemoButtonConfig[] = [
  { portal: 'user', label: 'Student Demo', icon: UserRound },
  { portal: 'admin', label: 'Admin Demo', icon: ShieldCheck },
];

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]';

const PAGE_BACKGROUND: CSSProperties = {
  backgroundColor: '#0f172a',
  backgroundImage:
    'radial-gradient(circle at 20% 0%, rgba(37, 99, 235, 0.28), transparent 45%), ' +
    'linear-gradient(rgba(148, 163, 184, 0.07) 1px, transparent 1px), ' +
    'linear-gradient(90deg, rgba(148, 163, 184, 0.07) 1px, transparent 1px)',
  backgroundSize: 'auto, 48px 48px, 48px 48px',
};

type FocusTarget = 'password' | 'invalid';

interface FocusRequest {
  count: number;
  target: FocusTarget;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function LoginPage({ onRegister }: LoginPageProps) {
  const { login, sessionExpired, dismissSessionExpired } = useAuth();

  const passwordId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [portal, setPortal] = useState<LoginPortal>('user');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest>({ count: 0, target: 'invalid' });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /* Move focus after the fields are enabled again (they are disabled while submitting). */
  useEffect(() => {
    if (focusRequest.count === 0) return;

    if (focusRequest.target === 'password') {
      passwordRef.current?.focus();
    } else {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [focusRequest]);

  const liveErrors = useMemo(
    () => validateLoginCredentials({ email, password, portal, rememberMe }),
    [email, password, portal, rememberMe],
  );

  const fieldError = (name: string): string | undefined => {
    const fromServer = serverErrors[name];
    if (fromServer) return fromServer;
    if (submitAttempted || touched[name]) return liveErrors[name];
    return undefined;
  };

  const markTouched = (name: string) => {
    setTouched((previous) => (previous[name] ? previous : { ...previous, [name]: true }));
  };

  const clearServerError = (name: string) => {
    setServerErrors((previous) => {
      if (!(name in previous)) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  /* The demo button whose details are currently in the form, if any. */
  const activeDemo = useMemo<LoginPortal | null>(() => {
    const normalizedEmail = email.trim().toLowerCase();
    const match = LOGIN_PORTALS.find((key) => {
      const demo = DEMO_CREDENTIALS[key];
      return (
        demo.email.toLowerCase() === normalizedEmail &&
        demo.password === password &&
        demo.portal === portal
      );
    });
    return match ?? null;
  }, [email, password, portal]);

  const applyDemo = (key: LoginPortal) => {
    const demo = DEMO_CREDENTIALS[key];

    setEmail(demo.email);
    setPassword(demo.password);
    setPortal(demo.portal);
    setShowPassword(false);
    setTouched({});
    setSubmitAttempted(false);
    setServerErrors({});
    setFormError(null);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    clearServerError('email');
    setFormError(null);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    clearServerError('password');
    setFormError(null);
  };

  const handlePortalChange = (value: string) => {
    setPortal(isLoginPortal(value) ? value : 'user');
    clearServerError('portal');
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmitAttempted(true);
    setFormError(null);
    setServerErrors({});

    if (Object.keys(liveErrors).length > 0) {
      setFocusRequest((previous) => ({ count: previous.count + 1, target: 'invalid' }));
      return;
    }

    setIsSubmitting(true);
    try {
      /* On success the auth state changes and App replaces this page. */
      await login({ email, password, portal, rememberMe });
    } catch (error) {
      if (!isMountedRef.current) return;

      const authError = toAuthError(error);
      setServerErrors(authError.fieldErrors ?? {});
      setFormError(authError.fieldErrors ? null : authError.message);

      if (authError.code === 'INVALID_CREDENTIALS') {
        /* Keep the email, clear the password, and let the user retype it. */
        setPassword('');
        setSubmitAttempted(false);
        setTouched((previous) => ({ ...previous, password: false }));
        setFocusRequest((previous) => ({ count: previous.count + 1, target: 'password' }));
      } else {
        setFocusRequest((previous) => ({ count: previous.count + 1, target: 'invalid' }));
      }
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4 py-10"
      style={PAGE_BACKGROUND}
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563eb]">
              <Building2 className="text-white" size={28} aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-slate-900">Welcome to EngiCare</h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Faculty Equipment &amp; Facilities Issue Reporting System
            </p>
          </div>

          {sessionExpired && (
            <div
              role="status"
              className="mt-6 flex items-start gap-3 rounded-lg border border-[#d97706]/30 bg-[#fef3c7] p-3"
            >
              <Clock className="mt-0.5 shrink-0 text-[#d97706]" size={18} aria-hidden="true" />
              <p className="flex-1 text-sm font-medium text-[#92400e]">
                Your session has expired. Sign in again to continue.
              </p>
              <button
                type="button"
                onClick={dismissSessionExpired}
                aria-label="Dismiss message"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#92400e] transition-colors hover:bg-[#d97706]/15 ${FOCUS_RING}`}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
            <p className="text-center text-xs font-medium text-slate-600">Quick demo access</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DEMO_BUTTONS.map(({ portal: key, label, icon: Icon }) => {
                const isActive = activeDemo === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyDemo(key)}
                    disabled={isSubmitting}
                    aria-pressed={isActive}
                    className={[
                      'flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-60',
                      FOCUS_RING,
                      isActive
                        ? 'border-[#2563eb] bg-[#dbeafe] text-[#1e40af]'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
            {activeDemo !== null && (
              <p
                role="status"
                className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-[#166534]"
              >
                <CircleCheck className="shrink-0 text-[#16a34a]" size={14} aria-hidden="true" />
                Demo details filled in. Press Sign in to continue.
              </p>
            )}
          </div>

          <form
            ref={formRef}
            noValidate
            onSubmit={handleSubmit}
            aria-label="Sign in"
            className="mt-6"
          >
            <fieldset disabled={isSubmitting} className="m-0 min-w-0 space-y-5 border-0 p-0">
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-lg border border-[#dc2626]/30 bg-[#fee2e2] p-3"
                >
                  <CircleAlert
                    className="mt-0.5 shrink-0 text-[#dc2626]"
                    size={18}
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium text-[#991b1b]">{formError}</p>
                </div>
              )}

              <Input
                label="University email"
                required
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={EMAIL_PLACEHOLDER_BY_PORTAL[portal]}
                leftIcon={<Mail size={16} aria-hidden="true" />}
                value={email}
                onChange={(event) => handleEmailChange(event.target.value)}
                onBlur={() => markTouched('email')}
                error={fieldError('email')}
                hint={`Students: @${STUDENT_EMAIL_DOMAIN}. Faculty and staff: @${STAFF_EMAIL_DOMAIN}.`}
              />

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor={passwordId} className="text-sm font-medium text-slate-800">
                    Password
                    <span className="ml-0.5 text-[#dc2626]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className={`flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 ${FOCUS_RING}`}
                  >
                    {showPassword ? (
                      <EyeOff size={14} aria-hidden="true" />
                    ) : (
                      <Eye size={14} aria-hidden="true" />
                    )}
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <Input
                  ref={passwordRef}
                  id={passwordId}
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  leftIcon={<Lock size={16} aria-hidden="true" />}
                  value={password}
                  onChange={(event) => handlePasswordChange(event.target.value)}
                  onBlur={() => markTouched('password')}
                  error={fieldError('password')}
                  hint="Forgot it? Reset it through the university IT services."
                />
              </div>

              <Select
                label="Login As Role"
                required
                options={PORTAL_OPTIONS}
                value={portal}
                onChange={(event) => handlePortalChange(event.target.value)}
                onBlur={() => markTouched('portal')}
                error={fieldError('portal')}
              />

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className={`h-4 w-4 rounded border-slate-300 accent-[#0f172a] ${FOCUS_RING}`}
                />
                Keep me signed in for 30 days
              </label>

              <Button
                type="submit"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
                loadingText="Signing in..."
                rightIcon={<ArrowRight size={18} aria-hidden="true" />}
              >
                Sign in
              </Button>
            </fieldset>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don’t have an account?{' '}
            <button
              type="button"
              onClick={onRegister}
              disabled={isSubmitting}
              className={`rounded font-medium text-[#2563eb] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
            >
              Register here
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          EngiCare · Faculty of Engineering
        </p>
      </div>
    </main>
  );
}