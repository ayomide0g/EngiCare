import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { CircleAlert } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Shared field pieces                                                 */
/* ------------------------------------------------------------------ */

const CONTROL_BASE =
  'block w-full rounded-lg border bg-white text-sm text-slate-900 placeholder:text-slate-400 ' +
  'transition-colors focus:outline-none focus:ring-2 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

const CONTROL_NORMAL =
  'border-slate-300 hover:border-slate-400 focus:border-[#2563eb] focus:ring-[#2563eb]/20';

const CONTROL_ERROR =
  'border-[#dc2626] hover:border-[#dc2626] focus:border-[#dc2626] focus:ring-[#dc2626]/20';

interface FieldLabelProps {
  htmlFor: string;
  label?: string;
  required?: boolean;
}

function FieldLabel({ htmlFor, label, required }: FieldLabelProps) {
  if (!label) return null;
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-800">
      {label}
      {required && (
        <span className="ml-0.5 text-[#dc2626]" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

interface FieldMessageProps {
  id: string;
  error?: string;
  hint?: string;
}

function FieldMessage({ id, error, hint }: FieldMessageProps) {
  if (error) {
    return (
      <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-[#b91c1c]">
        <CircleAlert className="mt-px shrink-0" size={14} aria-hidden="true" />
        <span>{error}</span>
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
        {hint}
      </p>
    );
  }
  return null;
}

const describedBy = (id: string, error?: string, hint?: string): string | undefined => {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
};

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visible label rendered above the field. */
  label?: string;
  /** Helper text shown under the field (hidden while an error is shown). */
  hint?: string;
  /** Validation message. When set, the field turns red and is marked invalid. */
  error?: string;
  /** Element rendered inside the field on the left (usually a Lucide icon). */
  leftIcon?: ReactNode;
  /** Extra classes for the outer wrapper (layout/placement only). */
  className?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, className = '', id, required, type = 'text', ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  const controlClasses = [
    CONTROL_BASE,
    error ? CONTROL_ERROR : CONTROL_NORMAL,
    'h-10',
    leftIcon ? 'pl-10 pr-3' : 'px-3',
  ].join(' ');

  return (
    <div className={className}>
      <FieldLabel htmlFor={fieldId} label={label} required={required} />
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-slate-400">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          type={type}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={controlClasses}
          {...rest}
        />
      </div>
      <FieldMessage id={fieldId} error={error} hint={hint} />
    </div>
  );
});

export default Input;

/* ------------------------------------------------------------------ */
/* Textarea (named export, same look and behavior as Input)            */
/* ------------------------------------------------------------------ */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  /**
   * Shows a "current / max" character counter. Requires `maxLength` and a
   * controlled `value`.
   */
  showCount?: boolean;
  /** Extra classes for the outer wrapper (layout/placement only). */
  className?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, showCount = false, className = '', id, required, rows = 4, maxLength, value, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  const controlClasses = [
    CONTROL_BASE,
    error ? CONTROL_ERROR : CONTROL_NORMAL,
    'resize-y px-3 py-2.5 leading-relaxed',
  ].join(' ');

  const currentLength = typeof value === 'string' ? value.length : 0;
  const counterVisible = showCount && typeof maxLength === 'number';

  return (
    <div className={className}>
      <FieldLabel htmlFor={fieldId} label={label} required={required} />
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        maxLength={maxLength}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={controlClasses}
        {...rest}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <FieldMessage id={fieldId} error={error} hint={hint} />
        </div>
        {counterVisible && (
          <p className="mt-1.5 shrink-0 text-xs tabular-nums text-slate-500" aria-hidden="true">
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
});