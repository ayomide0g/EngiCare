import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** The list of choices. */
  options: readonly SelectOption[];
  /** Visible label rendered above the field. */
  label?: string;
  /**
   * Text of the empty first option, e.g. "Select a building".
   * It is selected when `value` is an empty string.
   */
  placeholder?: string;
  /** Helper text shown under the field (hidden while an error is shown). */
  hint?: string;
  /** Validation message. When set, the field turns red and is marked invalid. */
  error?: string;
  /** Extra classes for the outer wrapper (layout/placement only). */
  className?: string;
}

const CONTROL_BASE =
  'block h-10 w-full appearance-none rounded-lg border bg-white pl-3 pr-10 text-sm ' +
  'transition-colors focus:outline-none focus:ring-2 [&>option]:text-slate-900 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

const CONTROL_NORMAL =
  'border-slate-300 hover:border-slate-400 focus:border-[#2563eb] focus:ring-[#2563eb]/20';

const CONTROL_ERROR =
  'border-[#dc2626] hover:border-[#dc2626] focus:border-[#dc2626] focus:ring-[#dc2626]/20';

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, label, placeholder, hint, error, className = '', id, required, value, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  const showingPlaceholder = placeholder !== undefined && value === '';

  const controlClasses = [
    CONTROL_BASE,
    error ? CONTROL_ERROR : CONTROL_NORMAL,
    showingPlaceholder ? 'text-slate-400' : 'text-slate-900',
  ].join(' ');

  const messageId = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-slate-800">
          {label}
          {required && (
            <span className="ml-0.5 text-[#dc2626]" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          required={required}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className={controlClasses}
          {...rest}
        >
          {placeholder !== undefined && (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500">
          <ChevronDown size={16} aria-hidden="true" />
        </span>
      </div>

      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-[#b91c1c]">
          <CircleAlert className="mt-px shrink-0" size={14} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Select;