import { useEffect, useId, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  /** Controls whether the modal is rendered. */
  isOpen: boolean;
  /** Called when the user asks to close (Esc, close button, overlay click). */
  onClose: () => void;
  /** Required heading. Also used as the accessible name of the dialog. */
  title: string;
  /** Optional sentence shown under the title. */
  description?: string;
  /** Main content. Scrolls internally when it is taller than the screen. */
  children?: ReactNode;
  /** Optional footer area, usually action buttons. Rendered right-aligned. */
  footer?: ReactNode;
  /** Max width of the dialog. Defaults to "md". */
  size?: ModalSize;
  /** Close when the dark overlay is clicked. Defaults to true. */
  closeOnOverlayClick?: boolean;
  /** Close when the Escape key is pressed. Defaults to true. */
  closeOnEscape?: boolean;
  /** Hides the X button in the header. Defaults to false. */
  hideCloseButton?: boolean;
  /** Extra classes for the dialog panel (rarely needed). */
  className?: string;
}

const SIZE_STYLES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  hideCloseButton = false,
  className = '',
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const mouseDownOnOverlayRef = useRef(false);

  /* Keep the latest callback in a ref so effects do not re-run (and steal
     focus) every time the parent re-renders with a new function instance. */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /* Lock page scroll while the modal is open. */
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  /* Move focus into the dialog on open and restore it to the trigger on close. */
  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;
    if (dialog) {
      const bodyFocusable = bodyRef.current ? getFocusableElements(bodyRef.current) : [];
      const target = bodyFocusable[0] ?? getFocusableElements(dialog)[0] ?? dialog;
      target.focus();
    }

    return () => {
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  /* Close on Escape. */
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape]);

  /* Keep Tab / Shift+Tab cycling inside the dialog. */
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  /* A click only closes the modal when it both started AND ended on the
     overlay, so selecting text inside the dialog and releasing outside
     does not close it by accident. */
  const handleOverlayMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    mouseDownOnOverlayRef.current = event.target === event.currentTarget;
  };

  const handleOverlayClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const startedOnOverlay = mouseDownOnOverlayRef.current;
    mouseDownOnOverlayRef.current = false;

    if (closeOnOverlayClick && startedOnOverlay && event.target === event.currentTarget) {
      onClose();
    }
  };

  const panelClasses = [
    'relative flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-xl border border-slate-200',
    'bg-white shadow-xl focus:outline-none',
    SIZE_STYLES[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/60 p-4"
      onMouseDown={handleOverlayMouseDown}
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={panelClasses}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-slate-600">
                {description}
              </p>
            )}
          </div>

          {!hideCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-2 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-5 text-sm text-slate-700">
          {children}
        </div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-3 rounded-b-xl border-t border-slate-200 bg-slate-50 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}