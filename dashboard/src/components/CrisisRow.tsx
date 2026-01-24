import { CountryCrisisMetrics } from '@/types';
import { getCountryFlag } from '@/lib/flags';

interface CrisisRowProps {
  crisis: CountryCrisisMetrics & { mismatchScore?: number };
  rank: number;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toFixed(0);
}

export function CrisisRow({ crisis, rank }: CrisisRowProps) {
  const needRate = (crisis.needRate * 100).toFixed(1);
  const coverageRate = (crisis.coverageRate * 100).toFixed(1);

  return (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-400">
        {rank}
      </span>
      
      <span className="text-xl">{getCountryFlag(crisis.iso3)}</span>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {crisis.country}
          </span>
          <span className="text-xs text-zinc-400">{crisis.iso3}</span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatNumber(crisis.inNeed)} in need
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
          {needRate}%
        </p>
        <p className="text-xs text-zinc-500">need rate</p>
      </div>

      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
          {coverageRate}%
        </p>
        <p className="text-xs text-zinc-500">coverage</p>
      </div>

      {crisis.usdPerPersonInNeed > 0 && (
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
            ${crisis.usdPerPersonInNeed.toFixed(0)}
          </p>
          <p className="text-xs text-zinc-500">per person</p>
        </div>
      )}
    </div>
  );
}
