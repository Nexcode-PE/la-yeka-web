import { ChangeEvent } from 'react';
import { labels } from '../lib/admin-config';

export function Stat({
  value,
  label,
  tone = 'amber',
  compact = false,
}: {
  value: number | string;
  label: string;
  tone?: 'amber' | 'green' | 'gray';
  compact?: boolean;
}) {
  const accents = { amber: 'bg-[#4169ff]', green: 'bg-emerald-500', gray: 'bg-slate-300' };
  return (
    <article
      className={`admin-card-motion relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30 ${compact ? 'p-3' : 'p-5'}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${accents[tone]}`} />
      <strong className={`block font-bold tracking-tight ${compact ? 'text-2xl' : 'text-3xl'}`}>
        {value}
      </strong>
      <span className={`block text-slate-500 ${compact ? 'mt-0.5 text-xs' : 'mt-1 text-sm'}`}>
        {label}
      </span>
    </article>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="mt-6 h-56 rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}

export function ContentSkeleton({ variant = 'rows' }: { variant?: 'cards' | 'rows' }) {
  const count = variant === 'cards' ? 8 : 5;
  return (
    <div
      className={
        variant === 'cards'
          ? 'grid grid-cols-[repeat(auto-fill,minmax(205px,1fr))] gap-4'
          : 'grid gap-3'
      }
    >
      {Array.from({ length: count }, (_, index) =>
        variant === 'cards' ? (
          <div
            key={index}
            className="animate-pulse rounded-xl border border-slate-200 bg-white p-3"
          >
            <div className="aspect-[1.35/0.9] rounded-lg bg-slate-100" />
            <div className="mt-3 h-4 w-3/4 rounded bg-slate-100" />
            <div className="mt-2 h-3 w-full rounded bg-slate-100" />
            <div className="mt-4 h-8 rounded bg-slate-100" />
          </div>
        ) : (
          <div
            key={index}
            className="animate-pulse rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="h-4 w-1/3 rounded bg-slate-100" />
            <div className="mt-3 h-3 w-2/3 rounded bg-slate-100" />
          </div>
        ),
      )}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm shadow-slate-200/30">
      {text}
    </div>
  );
}

export function Status({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label="Cambiar estado"
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none ring-[#4169ff] focus:ring-2"
      value={value}
      onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option]}
        </option>
      ))}
    </select>
  );
}
