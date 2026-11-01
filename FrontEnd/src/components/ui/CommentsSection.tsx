import { useState } from 'react';
import type { FormEvent } from 'react';
import { MessageSquare, Send } from 'lucide-react';

import {
  REPORT_VALIDATION,
  toServiceError,
  validateCommentMessage,
} from '../../services/reports.service';
import { USER_ROLE_LABELS } from '../../types/auth.types';
import type { ReportComment } from '../../types/report.types';
import { canManageReports } from '../../types/report.types';
import Button from './Button';
import Input from './Input';

export interface CommentsSectionProps {
  comments: ReportComment[];
  /** Id of the signed-in user, used to label their own comments as "You". */
  viewerId: string;
  /** Whether the viewer may write comments on this report. */
  canComment: boolean;
  /** Posts the message. Must reject when it fails; the error text is shown under the field. */
  onPost: (message: string) => Promise<void>;
  className?: string;
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function CommentsSection({
  comments,
  viewerId,
  canComment,
  onPost,
  className = '',
}: CommentsSectionProps) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPosting) return;

    const validationError = validateCommentMessage(message);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsPosting(true);
    setError(null);
    try {
      await onPost(message.trim());
      setMessage('');
    } catch (caught) {
      setError(toServiceError(caught).message);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <section
      aria-labelledby="comments-heading"
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <h2
        id="comments-heading"
        className="flex items-center gap-2 text-base font-semibold text-slate-900"
      >
        <MessageSquare size={18} aria-hidden="true" />
        Discussion &amp; Comments ({comments.length})
      </h2>

      {comments.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No comments yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {comments.map((comment) => {
            const isMine = comment.author.id !== null && comment.author.id === viewerId;
            const isTeam = canManageReports(comment.author);

            return (
              <li key={comment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                    {isMine ? 'You' : comment.author.displayName}
                    {isTeam && (
                      <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-xs font-medium text-[#1e40af]">
                        {USER_ROLE_LABELS[comment.author.role]}
                      </span>
                    )}
                  </p>
                  <time dateTime={comment.createdAt} className="text-xs text-slate-600">
                    {dateTimeFormatter.format(new Date(comment.createdAt))}
                  </time>
                </div>
                <p className="mt-1.5 whitespace-pre-line break-words text-sm text-slate-700">
                  {comment.message}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {canComment ? (
        <form noValidate onSubmit={handleSubmit} className="mt-4 flex items-start gap-3">
          <Input
            className="min-w-0 flex-1"
            aria-label="Add a remark or update"
            placeholder="Add a remark or update..."
            maxLength={REPORT_VALIDATION.COMMENT_MAX_LENGTH}
            autoComplete="off"
            value={message}
            disabled={isPosting}
            onChange={(event) => {
              setMessage(event.target.value);
              setError(null);
            }}
            error={error ?? undefined}
          />
          <Button
            type="submit"
            isLoading={isPosting}
            loadingText="Posting..."
            leftIcon={<Send size={16} aria-hidden="true" />}
          >
            Post
          </Button>
        </form>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Only the person who submitted this report and the facilities team can comment.
        </p>
      )}
    </section>
  );
}