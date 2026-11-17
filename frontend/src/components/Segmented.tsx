interface Option<T> {
  value: T;
  label: string;
}

export function Segmented<T extends string | number>({ options, value, onChange }: { options: Option<T>[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            o.value === value ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
