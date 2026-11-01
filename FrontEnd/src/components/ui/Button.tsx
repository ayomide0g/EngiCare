import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. Defaults to "primary". */
  variant?: ButtonVariant;
  /** Size. Defaults to "md". */
  size?: ButtonSize;
  /** Shows a spinner, disables the button and sets aria-busy. */
  isLoading?: boolean;
  /** Text shown next to the spinner while loading. Falls back to the normal children. */
  loadingText?: string;
  /** Element rendered before the label (usually a Lucide icon). */
  leftIcon?: ReactNode;
  /** Element rendered after the label (usually a Lucide icon). */
  rightIcon?: ReactNode;
  /** Stretches the button to the full width of its container. */
  fullWidth?: boolean;
}

/**
 * Brand palette:
 *  - primary    deep navy #0f172a (hover #1e293b)
 *  - secondary  slate-100 surface with navy text
 *  - outline    white surface with slate border
 *  - ghost      transparent, slate text
 *  - danger     red #dc2626 (hover #b91c1c)
 * Full class names are written out so Tailwind can detect them.
 */
const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#0f172a] text-white border border-[#0f172a] hover:bg-[#1e293b] hover:border-[#1e293b] focus-visible:outline-[#2563eb]',
  secondary:
    'bg-slate-100 text-[#0f172a] border border-slate-100 hover:bg-slate-200 hover:border-slate-200 focus-visible:outline-[#2563eb]',
  outline:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 focus-visible:outline-[#2563eb]',
  ghost:
    'bg-transparent text-slate-700 border border-transparent hover:bg-slate-100 focus-visible:outline-[#2563eb]',
  danger:
    'bg-[#dc2626] text-white border border-[#dc2626] hover:bg-[#b91c1c] hover:border-[#b91c1c] focus-visible:outline-[#dc2626]',
};

const SIZE_STYLES: Record<ButtonSize, { container: string; icon: number }> = {
  sm: { container: 'h-8 gap-1.5 px-3 text-sm', icon: 14 },
  md: { container: 'h-10 gap-2 px-4 text-sm', icon: 16 },
  lg: { container: 'h-12 gap-2.5 px-6 text-base', icon: 18 },
};

const BASE_STYLES =
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    type = 'button',
    className = '',
    children,
    ...rest
  },
  ref,
) {
  const sizeStyle = SIZE_STYLES[size];

  const classes = [
    BASE_STYLES,
    VARIANT_STYLES[variant],
    sizeStyle.container,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={classes}
      {...rest}
    >
      {isLoading ? (
        <Loader2
          className="shrink-0 animate-spin"
          size={sizeStyle.icon}
          strokeWidth={2.25}
          aria-hidden="true"
        />
      ) : (
        leftIcon
      )}
      {isLoading && loadingText ? loadingText : children}
      {!isLoading && rightIcon}
    </button>
  );
});

export default Button;