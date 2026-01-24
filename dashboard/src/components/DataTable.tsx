import { CountryCrisisMetrics } from '@/types';
import { getCountryFlag } from '@/lib/flags';

interface DataTableProps {
  data: CountryCrisisMetrics[];
  title: string;
  description?: string;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toFixed(0);
}

function formatPercent(num: number): string {
  return `${(num * 100).toFixed(1)}%`;
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(1)}M`;
  }
  return `$${formatNumber(num)}`;
}

export function DataTable({ data, title, description }: DataTableProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-4 py-2.5">Country</th>
              <th className="px-4 py-2.5 text-right">Population</th>
              <th className="px-4 py-2.5 text-right">In Need</th>
              <th className="px-4 py-2.5 text-right">Need Rate</th>
              <th className="px-4 py-2.5 text-right">Coverage</th>
              <th className="px-4 py-2.5 text-right">Requirements</th>
              <th className="px-4 py-2.5 text-right">$/Person</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.map((row) => (
              <tr
                key={row.iso3}
                className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{getCountryFlag(row.iso3)}</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {row.country}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {formatNumber(row.population)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                  {formatNumber(row.inNeed)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span
                    className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium tabular-nums ${
                      row.needRate > 0.5
                        ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                        : row.needRate > 0.3
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                    }`}
                  >
                    {formatPercent(row.needRate)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1 w-12 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${Math.min(row.coverageRate * 100, 100)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                      {formatPercent(row.coverageRate)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {row.revisedRequirements > 0
                    ? formatCurrency(row.revisedRequirements)
                    : '—'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {row.usdPerPersonInNeed > 0
                    ? `$${row.usdPerPersonInNeed.toFixed(0)}`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
