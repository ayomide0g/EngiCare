import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from 'react';
import {
  ChevronDown,
  ChevronsUp,
  CircleAlert,
  CircleCheck,
  ImagePlus,
  Lightbulb,
  Minus,
  Send,
  TriangleAlert,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import Button from '../components/ui/Button';
import { useCurrentUser } from '../context/useAuth';
import Input, { Textarea } from '../components/ui/Input';
import PriorityBadge from '../components/ui/PriorityBadge';
import Select from '../components/ui/Select';
import type { SelectOption } from '../components/ui/Select';
import StatusBadge from '../components/ui/StatusBadge';
import {
  REPORT_VALIDATION,
  createReport,
  toServiceError,
  validateCreateReportInput,
} from '../services/reports.service';
import type {
  BuildingId,
  CreateReportInput,
  Report,
  ReportCategory,
  ReportImageInput,
  ReportPriority,
} from '../types/report.types';
import {
  BUILDING_IDS,
  BUILDING_LABELS,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  REPORT_CATEGORIES,
  isBuildingId,
  isReportCategory,
  isReportPriority,
} from '../types/report.types';

export interface SubmitReportPageProps {
  /** Opens the details page of a report (used on the success screen). */
  onViewReport: (reportId: string) => void;
  /** Leaves the form and goes back to the dashboard. */
  onCancel: () => void;
  /** Called once after a report has been created (e.g. to refresh counters). */
  onSubmitted?: (report: Report) => void;
}

/* ------------------------------------------------------------------ */
/* Form model                                                          */
/* ------------------------------------------------------------------ */

interface FormValues {
  title: string;
  description: string;
  category: ReportCategory | '';
  priority: ReportPriority;
  buildingId: BuildingId | '';
  /** Kept as a string so the field can be empty while typing. */
  floor: string;
  room: string;
}

const INITIAL_VALUES: FormValues = {
  title: '',
  description: '',
  category: '',
  priority: 'medium',
  buildingId: '',
  floor: '',
  room: '',
};

const parseFloor = (raw: string): number => (raw.trim() === '' ? Number.NaN : Number(raw));

/** Converts the form state into the payload shape the service validates. */
const toCreateReportInput = (values: FormValues, images: ReportImageInput[]): CreateReportInput => ({
  title: values.title,
  description: values.description,
  // An empty selection is passed through on purpose: the validator reports it
  // as "Select a category." / "Select a building.".
  category: values.category as ReportCategory,
  priority: values.priority,
  location: {
    buildingId: values.buildingId as BuildingId,
    floor: parseFloor(values.floor),
    room: values.room,
  },
  images,
});

/* ------------------------------------------------------------------ */
/* Static options                                                      */
/* ------------------------------------------------------------------ */

const CATEGORY_OPTIONS: SelectOption[] = REPORT_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

const BUILDING_OPTIONS: SelectOption[] = BUILDING_IDS.map((value) => ({
  value,
  label: BUILDING_LABELS[value],
}));

interface PriorityOption {
  value: ReportPriority;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  /** Classes applied when the radio is selected (uses the `peer` input). */
  checkedClass: string;
}

const NEUTRAL_CHECKED =
  'peer-checked:border-[#0f172a] peer-checked:bg-slate-50 peer-checked:ring-2 peer-checked:ring-[#0f172a]';
const RED_CHECKED =
  'peer-checked:border-[#dc2626] peer-checked:bg-[#fee2e2] peer-checked:ring-2 peer-checked:ring-[#dc2626]';

const PRIORITY_OPTIONS: readonly PriorityOption[] = [
  {
    value: 'low',
    description: 'Minor inconvenience',
    icon: ChevronDown,
    iconClass: 'text-slate-500',
    checkedClass: NEUTRAL_CHECKED,
  },
  {
    value: 'medium',
    description: 'Affects daily use',
    icon: Minus,
    iconClass: 'text-slate-600',
    checkedClass: NEUTRAL_CHECKED,
  },
  {
    value: 'high',
    description: 'Blocks an activity',
    icon: ChevronsUp,
    iconClass: 'text-[#dc2626]',
    checkedClass: RED_CHECKED,
  },
  {
    value: 'urgent',
    description: 'Safety risk or emergency',
    icon: TriangleAlert,
    iconClass: 'text-[#dc2626]',
    checkedClass: RED_CHECKED,
  },
];

const TIPS: readonly string[] = [
  'Write a clear title that says what is wrong and where.',
  'Give the exact room number so the technician can find it fast.',
  'Describe what you noticed and when it started.',
  'Attach a photo whenever possible. It speeds up the repair.',
  'Choose Urgent only for safety risks or issues that stop teaching.',
];

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]';

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="space-y-5 border-b border-slate-200 px-5 py-6 last:border-b-0 sm:px-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function SubmitReportPage({
  onViewReport,
  onCancel,
  onSubmitted,
}: SubmitReportPageProps) {
  const fileInputId = useId();
    const user = useCurrentUser();
  const formRef = useRef<HTMLFormElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const nextImageId = useRef(0);

  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [images, setImages] = useState<ReportImageInput[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);

  /* Release preview object URLs when the page is left. */
  const imagesRef = useRef<ReportImageInput[]>([]);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(
    () => () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    },
    [],
  );

  /* Move focus to the first invalid field after a failed submit. */
  useEffect(() => {
    if (focusRequest === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusRequest]);

  /* Move focus to the success heading when the report has been created. */
  useEffect(() => {
    if (!submittedReport) return;
    window.scrollTo({ top: 0, left: 0 });
    successHeadingRef.current?.focus();
  }, [submittedReport]);

  const liveErrors = useMemo(
    () => validateCreateReportInput(toCreateReportInput(values, images)),
    [values, images],
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

  const updateField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    clearServerError(key);
  };

  /* ---------------------------- Images ---------------------------- */

  const maxImages = REPORT_VALIDATION.MAX_IMAGES;
  const isFull = images.length >= maxImages;
  const maxSizeMb = REPORT_VALIDATION.MAX_IMAGE_SIZE_BYTES / (1024 * 1024);

  const addFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;

    const problems = new Set<string>();
    const accepted: ReportImageInput[] = [];
    let freeSlots: number = maxImages - images.length;

    for (const file of incoming) {
      if (!file.type.startsWith('image/')) {
        problems.add(`“${file.name}” is not an image.`);
        continue;
      }
      if (file.size > REPORT_VALIDATION.MAX_IMAGE_SIZE_BYTES) {
        problems.add(`“${file.name}” is larger than ${maxSizeMb} MB.`);
        continue;
      }
      if (freeSlots <= 0) {
        problems.add(`You can attach up to ${maxImages} images.`);
        break;
      }

      nextImageId.current += 1;
      accepted.push({
        id: `img-${Date.now()}-${nextImageId.current}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
      freeSlots -= 1;
    }

    if (accepted.length > 0) {
      setImages((previous) => [...previous, ...accepted]);
      clearServerError('images');
    }
    setUploadError(problems.size > 0 ? Array.from(problems).join(' ') : null);
  };

  const removeImage = (imageId: string) => {
    const target = images.find((image) => image.id === imageId);
    if (target) URL.revokeObjectURL(target.previewUrl);

    setImages((previous) => previous.filter((image) => image.id !== imageId));
    setUploadError(null);
    clearServerError('images');
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
    /* Reset so choosing the same file again still fires a change event. */
    event.target.value = '';
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!isFull && !isSubmitting) setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isFull || isSubmitting) return;
    addFiles(Array.from(event.dataTransfer.files));
  };

  /* ---------------------------- Submit ---------------------------- */

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
      const report = await createReport(user, toCreateReportInput(values, images));

      images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setImages([]);
      setSubmittedReport(report);
      onSubmitted?.(report);
    } catch (error) {
      const serviceError = toServiceError(error);
      setServerErrors(serviceError.fieldErrors ?? {});
      setFormError(serviceError.message);
      setFocusRequest((count) => count + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages([]);
    setValues(INITIAL_VALUES);
    setTouched({});
    setSubmitAttempted(false);
    setServerErrors({});
    setFormError(null);
    setUploadError(null);
    setSubmittedReport(null);
  };

  /* --------------------------- Success view ----------------------- */

  if (submittedReport) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#dcfce7]">
          <CircleCheck className="text-[#16a34a]" size={30} aria-hidden="true" />
        </div>

        <h2
          ref={successHeadingRef}
          tabIndex={-1}
          className="mt-5 text-xl font-semibold text-slate-900 focus:outline-none"
        >
          Report submitted
        </h2>
        <p role="status" className="mt-2 text-sm text-slate-600">
          Thank you. Your report was received and the maintenance team will review it. Keep the
          reference number below to follow its progress.
        </p>

        <dl className="mt-6 space-y-3 rounded-lg bg-slate-50 p-4 text-left text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-600">Reference</dt>
            <dd className="font-semibold tracking-wide text-slate-900">
              {submittedReport.referenceNumber}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="shrink-0 text-slate-600">Title</dt>
            <dd className="text-right font-medium text-slate-900">{submittedReport.title}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-600">Priority</dt>
            <dd>
              <PriorityBadge priority={submittedReport.priority} size="sm" />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-600">Status</dt>
            <dd>
              <StatusBadge status={submittedReport.status} size="sm" />
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => onViewReport(submittedReport.id)}>View report</Button>
          <Button variant="outline" onClick={resetForm}>
            Submit another report
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  /* ----------------------------- Form view ------------------------ */

  const imagesError = uploadError ?? fieldError('images');
  const imagesHelpId = `${fileInputId}-help`;

  const dropzoneClasses = [
    'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
    'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#2563eb]',
    isFull || isSubmitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
    isDragging
      ? 'border-[#2563eb] bg-[#dbeafe]'
      : imagesError
        ? 'border-[#dc2626] bg-slate-50'
        : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100',
  ].join(' ');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <form
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        aria-label="Submit a new report"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2"
      >
        <fieldset disabled={isSubmitting} className="m-0 min-w-0 border-0 p-0">
          {formError && (
            <div
              role="alert"
              className="mx-5 mt-5 flex items-start gap-3 rounded-lg border border-[#dc2626]/30 bg-[#fee2e2] p-4 sm:mx-6"
            >
              <CircleAlert className="mt-0.5 shrink-0 text-[#dc2626]" size={18} aria-hidden="true" />
              <p className="text-sm font-medium text-[#991b1b]">{formError}</p>
            </div>
          )}

          <FormSection
            title="Issue details"
            description="Tell us what is wrong. Fields marked with * are required."
          >
            <Input
              label="Title"
              required
              autoComplete="off"
              placeholder="Projector not working in lecture hall"
              maxLength={REPORT_VALIDATION.TITLE_MAX_LENGTH}
              value={values.title}
              onChange={(event) => updateField('title', event.target.value)}
              onBlur={() => markTouched('title')}
              error={fieldError('title')}
              hint="A short summary of the problem."
            />

            <Select
              label="Category"
              required
              placeholder="Select a category"
              options={CATEGORY_OPTIONS}
              value={values.category}
              onChange={(event) =>
                updateField('category', isReportCategory(event.target.value) ? event.target.value : '')
              }
              onBlur={() => markTouched('category')}
              error={fieldError('category')}
            />

            <Textarea
              label="Description"
              required
              rows={5}
              showCount
              maxLength={REPORT_VALIDATION.DESCRIPTION_MAX_LENGTH}
              placeholder="Describe what happened, when it started, and how it affects you."
              value={values.description}
              onChange={(event) => updateField('description', event.target.value)}
              onBlur={() => markTouched('description')}
              error={fieldError('description')}
              hint={`At least ${REPORT_VALIDATION.DESCRIPTION_MIN_LENGTH} characters.`}
            />

            <fieldset className="min-w-0">
              <legend className="mb-1.5 text-sm font-medium text-slate-800">
                Priority
                <span className="ml-0.5 text-[#dc2626]" aria-hidden="true">
                  *
                </span>
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PRIORITY_OPTIONS.map(({ value, description, icon: Icon, iconClass, checkedClass }) => (
                  <label key={value} className="relative block cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={value}
                      checked={values.priority === value}
                      onChange={(event) => {
                        if (isReportPriority(event.target.value)) {
                          updateField('priority', event.target.value);
                        }
                      }}
                      className="peer sr-only"
                    />
                    <span
                      className={[
                        'flex h-full flex-col rounded-lg border border-slate-300 bg-white p-3 transition-colors',
                        'hover:border-slate-400',
                        'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#2563eb]',
                        checkedClass,
                      ].join(' ')}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <Icon className={iconClass} size={16} aria-hidden="true" />
                        {PRIORITY_LABELS[value]}
                      </span>
                      <span className="mt-1 text-xs text-slate-600">{description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </FormSection>

          <FormSection title="Location" description="Where is the problem?">
            <Select
              label="Building"
              required
              placeholder="Select a building"
              options={BUILDING_OPTIONS}
              value={values.buildingId}
              onChange={(event) =>
                updateField('buildingId', isBuildingId(event.target.value) ? event.target.value : '')
              }
              onBlur={() => markTouched('buildingId')}
              error={fieldError('buildingId')}
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="Floor"
                required
                type="number"
                inputMode="numeric"
                step={1}
                min={REPORT_VALIDATION.FLOOR_MIN}
                max={REPORT_VALIDATION.FLOOR_MAX}
                placeholder="0"
                value={values.floor}
                onChange={(event) => updateField('floor', event.target.value)}
                onBlur={() => markTouched('floor')}
                error={fieldError('floor')}
                hint="0 is the ground floor. Use a negative number for a basement."
              />
              <Input
                label="Room / hall / lab"
                required
                autoComplete="off"
                placeholder="B-204"
                maxLength={REPORT_VALIDATION.ROOM_MAX_LENGTH}
                value={values.room}
                onChange={(event) => updateField('room', event.target.value)}
                onBlur={() => markTouched('room')}
                error={fieldError('room')}
                hint="The number on the door."
              />
            </div>
          </FormSection>

          <FormSection
            title="Photos"
            description={`Optional. Add up to ${maxImages} images (${maxSizeMb} MB each).`}
          >
            <div>
              <label
                htmlFor={fileInputId}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={dropzoneClasses}
              >
                <ImagePlus className="text-slate-500" size={28} aria-hidden="true" />
                <span className="mt-2 text-sm font-medium text-slate-800">
                  {isFull ? 'Image limit reached' : 'Click to upload or drag and drop'}
                </span>
                <span className="mt-1 text-xs text-slate-600">
                  PNG, JPG or WebP, up to {maxSizeMb} MB each
                </span>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isFull || isSubmitting}
                  onChange={handleFileInputChange}
                  aria-invalid={imagesError ? true : undefined}
                  aria-describedby={imagesHelpId}
                  className="sr-only"
                />
              </label>

              <p
                id={imagesHelpId}
                aria-live="polite"
                className={`mt-2 flex items-start gap-1.5 text-xs ${
                  imagesError ? 'font-medium text-[#b91c1c]' : 'text-slate-600'
                }`}
              >
                {imagesError ? (
                  <>
                    <CircleAlert className="mt-px shrink-0" size={14} aria-hidden="true" />
                    <span>{imagesError}</span>
                  </>
                ) : (
                  <span>
                    {images.length} of {maxImages} images attached
                  </span>
                )}
              </p>

              {images.length > 0 && (
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((image) => (
                    <li
                      key={image.id}
                      className="relative overflow-hidden rounded-lg border border-slate-200 bg-white"
                    >
                      <img
                        src={image.previewUrl}
                        alt={`Preview of ${image.file.name}`}
                        className="aspect-[4/3] w-full bg-slate-100 object-cover"
                      />
                      <div className="px-2.5 py-2">
                        <p className="truncate text-xs font-medium text-slate-800">{image.file.name}</p>
                        <p className="text-xs text-slate-600">{formatBytes(image.file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        aria-label={`Remove ${image.file.name}`}
                        className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm ring-1 ring-slate-300 transition-colors hover:bg-[#fee2e2] hover:text-[#dc2626] ${FOCUS_RING}`}
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FormSection>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              loadingText="Submitting..."
              leftIcon={<Send size={16} aria-hidden="true" />}
            >
              Submit report
            </Button>
          </div>
        </fieldset>
      </form>

      <aside className="lg:col-span-1" aria-label="Tips for a good report">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fef3c7]">
              <Lightbulb className="text-[#d97706]" size={16} aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold text-slate-900">Tips for a good report</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {TIPS.map((tip) => (
              <li key={tip} className="flex gap-2">
                <CircleCheck className="mt-0.5 shrink-0 text-[#16a34a]" size={16} aria-hidden="true" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}