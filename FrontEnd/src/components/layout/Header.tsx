import { useState } from 'react';
import type { FormEvent } from 'react';
import { Menu, Plus, Search } from 'lucide-react';

import Button from '../ui/Button';
import Input from '../ui/Input';

export interface HeaderProps {
  /** Page title shown as the main heading (h1). */
  title: string;
  /** Optional one-line description under the title. Hidden on small screens. */
  subtitle?: string;
  /** Opens the mobile sidebar drawer. The menu button is only visible on small screens. */
  onMenuClick: () => void;
  /**
   * Called with the trimmed query when the search form is submitted.
   * When omitted, the search field is not rendered.
   */
  onSearch?: (query: string) => void;
  /**
   * Called when "New report" is pressed.
   * When omitted, the button is not rendered (e.g. on the submit page itself).
   */
  onNewReport?: () => void;
}

export default function Header({
  title,
  subtitle,
  onMenuClick,
  onSearch,
  onNewReport,
}: HeaderProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = query.trim();
    if (!onSearch || trimmed.length === 0) return;

    onSearch(trimmed);
    setQuery('');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] lg:hidden"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold leading-tight text-slate-900 sm:text-xl">
          {title}
        </h1>
        {subtitle && (
          <p className="hidden truncate text-sm text-slate-600 sm:block">{subtitle}</p>
        )}
      </div>

      {onSearch && (
        <form role="search" onSubmit={handleSubmit} className="hidden w-64 shrink-0 sm:block lg:w-80">
          <Input
            type="search"
            aria-label="Search reports"
            placeholder="Search reports"
            leftIcon={<Search size={16} aria-hidden="true" />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
      )}

      {onNewReport && (
        <Button
          onClick={onNewReport}
          leftIcon={<Plus size={16} aria-hidden="true" />}
          aria-label="New report"
          className="shrink-0"
        >
          <span className="hidden sm:inline">New report</span>
        </Button>
      )}
    </header>
  );
}