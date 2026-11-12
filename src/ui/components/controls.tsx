import { useEffect, useId, useState, type ReactNode } from 'react';

export function Toggle({ checked, onChange, label, description, disabled }: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <div className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
        {description && <div className="mt-0.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">{description}</div>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${checked ? 'bg-teal-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

/** Number input that commits on blur/Enter and clamps to [min, max]. */
export function NumberField({ value, onChange, min, max, suffix, label, description, disabled }: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  suffix?: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Math.round(Number(draft));
    const clamped = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : value;
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };
  return (
    <div className={`flex items-start justify-between gap-4 py-3 ${disabled ? 'opacity-50' : ''}`}>
      <label htmlFor={id} className="min-w-0 flex-1">
        <div className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
        {description && <div className="mt-0.5 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">{description}</div>}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          disabled={disabled}
          type="number"
          min={min}
          max={max}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-right text-[14px] dark:border-zinc-600 dark:bg-zinc-900"
        />
        {suffix && <span className="text-[13px] text-zinc-500">{suffix}</span>}
      </div>
    </div>
  );
}

export function Card({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-6 rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-[16px] font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      {description && <p className="mt-1 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>}
      <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">{children}</div>
    </section>
  );
}

export function Button({ children, onClick, variant = 'primary', disabled, type = 'button' }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const styles = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700',
    secondary: 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800',
    danger: 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40',
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}>
      {children}
    </button>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  const styles =
    tone === 'warn'
      ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
      : 'border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200';
  return <div className={`my-3 rounded-lg border px-3 py-2 text-[13px] leading-5 ${styles}`}>{children}</div>;
}
