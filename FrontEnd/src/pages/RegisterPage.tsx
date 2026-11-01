import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import {
  ArrowLeft,
  Building2,
  Circle,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  UserPlus,
  UserRound,
} from 'lucide-react';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { SelectOption } from '../components/ui/Select';
import { useAuth } from '../context/useAuth';
import {
  EMAIL_DOMAIN_BY_ROLE,
  STAFF_EMAIL_DOMAIN,
  STUDENT_EMAIL_DOMAIN,
} from '../data/mockAccounts';
import {
  AUTH_VALIDATION,
  PASSWORD_REQUIREMENTS,
  toAuthError,
  validateRegisterInput,
} from '../services/auth.service';
import type { DepartmentId, RegisterInput, RegistrableRole } from '../types/auth.types';
import {
  DEPARTMENT_IDS,
  DEPARTMENT_LABELS,
  REGISTRABLE_ROLES,
  USER_ROLE_LABELS,
  isDepartmentId,
  isRegistrableRole,
} from '../types/auth.types';

export interface RegisterPageProps {
  /** Goes back to the sign-in page. */
  onBackToLogin: () => void;
}

/* ------------------------------------------------------------------ */
/* Form model                                                          */
/* ------------------------------------------------------------------ */

interface FormValues {
  role: RegistrableRole | '';
  fullName: string;
  email: string;
  department: DepartmentId | '';
  password: string;
  confirmPassword: string;
}

const INITIAL_VALUES: FormValues = {
  role: '',
  fullName: '',
  email: '',
  department: '',
  password: '',
  confirmPassword: '',
};

/** Converts the form state into the payload shape the service validates. */
const toRegisterInput = (values: FormValues): RegisterInput => ({
  fullName: values.fullName,
  email: values.email,
  password: values.password,
  confirmPassword: values.confirmPassword,
  // An empty selection is passed through on purpose: the validator reports it
  // as "Select your role." / "Select your department.".
  role: values.role as RegistrableRole,
  department: values.department as DepartmentId,
});

/* ------------------------------------------------------------------ */
/* Static data                                                         */
/* ------------------------------------------------------------------ */

const ROLE_OPTIONS: SelectOption[] = REGISTRABLE_ROLES.map((value) => ({
  value,
  label: USER_ROLE_LABELS[value],
}));

const DEPARTMENT_OPTIONS: SelectOption[] = DEPARTMENT_IDS.map((value) => ({
  value,
  label: DEPARTMENT_LABELS[value],
}));

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

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

interface ShowHideButtonProps {
  isVisible: boolean;
  onToggle: () => void;
}

function ShowHideButton({ isVisible, onToggle }: ShowHideButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isVisible ? 'Hide passwords' : 'Show passwords'}
      className={`flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 ${FOCUS_RING}`}
    >
      {isVisible ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
      {isVisible ? 'Hide' : 'Show'}
    </button>
  );
}

interface PasswordChecklistProps {
  password: string;
}

function PasswordChecklist({ password }: PasswordChecklistProps) {
  return (
    <ul aria-label="Password requirements" className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
      {PASSWORD_REQUIREMENTS.map((requirement) => {
        const isMet = requirement.isMet(password);
        return (
          <li
            key={requirement.id}
            className={`flex items-center gap-1.5 text-xs ${
              isMet ? 'font-medium text-[#166534]' : 'text-slate-600'
            }`}
          >
            {isMet ? (
              <CircleCheck className="shrink-0 text-[#16a34a]" size={14} aria-hidden="true" />
            ) : (
              <Circle className="shrink-0 text-slate-400" size={14} aria-hidden="true" />
            )}
            <span>
              {requirement.label}
              <span className="sr-only">{isMet ? ' (done)' : ' (not done yet)'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function RegisterPage({ onBackToLogin }: RegisterPageProps) {
  const { register } = useAuth();

  const passwordId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const isMountedRef = useRef(true);

  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [showPasswords, setShowPasswords] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /* Move focus to the first invalid field once the fields are enabled again. */
  useEffect(() => {
    if (focusRequest === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusRequest]);

  const liveErrors = useMemo(() => validateRegisterInput(toRegisterInput(values)), [values]);

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

  const updateField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    clearServerError(key);
    setFormError(null);
  };

  const emailPlaceholder =
    values.role === ''
      ? `name@${STUDENT_EMAIL_DOMAIN}`
      : `name@${EMAIL_DOMAIN_BY_ROLE[values.role]}`;

  const emailHint =
    values.role === ''
      ? `Students: @${STUDENT_EMAIL_DOMAIN}. Faculty and staff: @${STAFF_EMAIL_DOMAIN}.`
      : `Use your university email (@${EMAIL_DOMAIN_BY_ROLE[values.role]}).`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmitAttempted(true);
    setFormError(null);
    setServerErrors({});

    if (Object.keys(liveErrors).length > 0) {
      setFocusRequest((count) => count + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      /* On success the auth state changes and App replaces this page. */
      await register(toRegisterInput(values));
    } catch (error) {
      if (!isMountedRef.current) return;

      const authError = toAuthError(error);
      setServerErrors(authError.fieldErrors ?? {});
      setFormError(authError.fieldErrors ? null : authError.message);
      setFocusRequest((count) => count + 1);
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  const passwordError = fieldError('password');
  const showChecklist = values.password.length > 0 || touched.password === true || submitAttempted;
  const fieldType = showPasswords ? 'text' : 'password';

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4 py-10"
      style={PAGE_BACKGROUND}
    >
      <div className="w-full max-w-lg">
        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <button
            type="button"
            onClick={onBackToLogin}
            disabled={isSubmitting}
            className={`-ml-1 flex items-center gap-1.5 rounded px-1 py-0.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to sign in
          </button>

          <div className="mt-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563eb]">
              <Building2 className="text-white" size={28} aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-slate-900">Create your account</h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Register with your university email to report and follow faculty issues.
            </p>
          </div>

          <form
            ref={formRef}
            noValidate
            onSubmit={handleSubmit}
            aria-label="Create an account"
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

              <Select
                label="I am a"
                required
                placeholder="Select your role"
                options={ROLE_OPTIONS}
                value={values.role}
                onChange={(event) =>
                  updateField('role', isRegistrableRole(event.target.value) ? event.target.value : '')
                }
                onBlur={() => markTouched('role')}
                error={fieldError('role')}
                hint="Accounts for facilities admins and technicians are created by the faculty."
              />

              <Input
                label="Full name"
                required
                autoComplete="name"
                placeholder="Ahmed Khalil"
                maxLength={AUTH_VALIDATION.NAME_MAX_LENGTH}
                leftIcon={<UserRound size={16} aria-hidden="true" />}
                value={values.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                onBlur={() => markTouched('fullName')}
                error={fieldError('fullName')}
              />

              <Input
                label="University email"
                required
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={emailPlaceholder}
                maxLength={AUTH_VALIDATION.EMAIL_MAX_LENGTH}
                leftIcon={<Mail size={16} aria-hidden="true" />}
                value={values.email}
                onChange={(event) => updateField('email', event.target.value)}
                onBlur={() => markTouched('email')}
                error={fieldError('email')}
                hint={emailHint}
              />

              <Select
                label="Department"
                required
                placeholder="Select your department"
                options={DEPARTMENT_OPTIONS}
                value={values.department}
                onChange={(event) =>
                  updateField(
                    'department',
                    isDepartmentId(event.target.value) ? event.target.value : '',
                  )
                }
                onBlur={() => markTouched('department')}
                error={fieldError('department')}
              />

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor={passwordId} className="text-sm font-medium text-slate-800">
                    Password
                    <span className="ml-0.5 text-[#dc2626]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <ShowHideButton
                    isVisible={showPasswords}
                    onToggle={() => setShowPasswords((current) => !current)}
                  />
                </div>
                <Input
                  id={passwordId}
                  required
                  type={fieldType}
                  autoComplete="new-password"
                  placeholder="Create a password"
                  maxLength={AUTH_VALIDATION.PASSWORD_MAX_LENGTH}
                  leftIcon={<Lock size={16} aria-hidden="true" />}
                  value={values.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  onBlur={() => markTouched('password')}
                  error={passwordError}
                />
                {showChecklist && <PasswordChecklist password={values.password} />}
              </div>

              <Input
                label="Confirm password"
                required
                type={fieldType}
                autoComplete="new-password"
                placeholder="Repeat your password"
                maxLength={AUTH_VALIDATION.PASSWORD_MAX_LENGTH}
                leftIcon={<Lock size={16} aria-hidden="true" />}
                value={values.confirmPassword}
                onChange={(event) => updateField('confirmPassword', event.target.value)}
                onBlur={() => markTouched('confirmPassword')}
                error={fieldError('confirmPassword')}
              />

              <Button
                type="submit"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
                loadingText="Creating account..."
                leftIcon={<UserPlus size={18} aria-hidden="true" />}
              >
                Create account
              </Button>
            </fieldset>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onBackToLogin}
              disabled={isSubmitting}
              className={`rounded font-medium text-[#2563eb] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
            >
              Sign in
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