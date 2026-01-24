'use client';

interface YearSelectorProps {
  years: number[];
  selectedYear: number;
  onChange: (year: number) => void;
}

export function YearSelector({ years, selectedYear, onChange }: YearSelectorProps) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
      {years.map((year) => (
        <button
          key={year}
          onClick={() => onChange(year)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
            selectedYear === year
              ? 'bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100'
          }`}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
