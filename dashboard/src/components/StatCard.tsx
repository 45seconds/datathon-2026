interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({ title, value, subtitle, trend }: StatCardProps) {
  const trendColors = {
    up: 'text-emerald-600 dark:text-emerald-400',
    down: 'text-red-500 dark:text-red-400',
    neutral: 'text-zinc-500 dark:text-zinc-400',
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      {subtitle && (
        <p
          className={`mt-0.5 text-xs ${trend ? trendColors[trend] : 'text-zinc-500 dark:text-zinc-400'}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
