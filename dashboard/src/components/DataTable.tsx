import { CountryCrisisMetrics } from '@/types';
import { getCountryFlag } from '@/lib/flags';

interface DataTableProps {
  data: CountryCrisisMetrics[];
  title: string;
  description?: string;
<<<<<<< HEAD
=======
  onCountryClick?: (iso3: string) => void;
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

function formatPercent(num: number): string {
<<<<<<< HEAD
  return `${(num * 100).toFixed(1)}%`;
=======
  return `${(num * 100).toFixed(0)}%`;
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
<<<<<<< HEAD
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  return `$${formatNumber(num)}`;
}

export function DataTable({ data, title, description }: DataTableProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">{title}</h2>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-sm text-zinc-500 dark:border-zinc-800">
              <th className="pb-4 pr-6 font-medium">Country</th>
              <th className="pb-4 px-6 text-right font-medium">Population</th>
              <th className="pb-4 px-6 text-right font-medium">In Need</th>
              <th className="pb-4 px-6 text-right font-medium">Need Rate</th>
              <th className="pb-4 px-6 text-right font-medium">Coverage</th>
              <th className="pb-4 px-6 text-right font-medium">Requirements</th>
              <th className="pb-4 pl-6 text-right font-medium">$/Person</th>
=======
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(0)}M`;
  return `$${formatNumber(num)}`;
}

export function DataTable({ data, title, description, onCountryClick }: DataTableProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium text-neutral-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
        {onCountryClick && (
          <p className="mt-1 text-xs text-neutral-400">
            💡 Click on any country to view it on the map
          </p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
              <th className="pb-3 pr-4 font-medium">Country</th>
              <th className="pb-3 px-4 text-right font-medium">Population</th>
              <th className="pb-3 px-4 text-right font-medium">In Need</th>
              <th className="pb-3 px-4 text-right font-medium">Need Rate</th>
              <th className="pb-3 px-4 text-right font-medium">Coverage</th>
              <th className="pb-3 px-4 text-right font-medium">Funding</th>
              <th className="pb-3 pl-4 text-right font-medium">$/Person</th>
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.iso3}
<<<<<<< HEAD
                className={i < data.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800/50' : ''}
              >
                <td className="py-4 pr-6">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getCountryFlag(row.iso3)}</span>
                    <div>
                      <span className="font-medium text-zinc-900 dark:text-white">{row.country}</span>
                      <span className="ml-2 text-xs text-zinc-400">{row.iso3}</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {formatNumber(row.population)}
                </td>
                <td className="py-4 px-6 text-right tabular-nums font-medium text-zinc-900 dark:text-white">
                  {formatNumber(row.inNeed)}
                </td>
                <td className="py-4 px-6 text-right">
                  <span
                    className={`tabular-nums font-medium ${
                      row.needRate > 0.5
                        ? 'text-red-600'
                        : row.needRate > 0.3
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                    }`}
                  >
                    {formatPercent(row.needRate)}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(row.coverageRate * 100, 100)}%` }}
                      />
                    </div>
                    <span className="w-14 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
=======
                onClick={() => onCountryClick?.(row.iso3)}
                className={`${i < data.length - 1 ? 'border-b border-neutral-100' : ''} ${onCountryClick ? 'cursor-pointer transition-colors hover:bg-neutral-50' : ''}`}
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{getCountryFlag(row.iso3)}</span>
                    <span className="text-neutral-900">{row.country}</span>
                    <span className="text-xs text-neutral-400">{row.iso3}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-neutral-500">
                  {formatNumber(row.population)}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-neutral-900">
                  {formatNumber(row.inNeed)}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-neutral-900">
                  {formatPercent(row.needRate)}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1 w-12 overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className="h-full rounded-full bg-neutral-900"
                        style={{ width: `${Math.min(row.coverageRate * 100, 100)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right tabular-nums text-neutral-500">
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
                      {formatPercent(row.coverageRate)}
                    </span>
                  </div>
                </td>
<<<<<<< HEAD
                <td className="py-4 px-6 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {row.revisedRequirements > 0 ? formatCurrency(row.revisedRequirements) : '—'}
                </td>
                <td className="py-4 pl-6 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
=======
                <td className="py-3 px-4 text-right tabular-nums text-neutral-500">
                  {row.revisedRequirements > 0 ? formatCurrency(row.revisedRequirements) : '—'}
                </td>
                <td className="py-3 pl-4 text-right tabular-nums text-neutral-500">
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
                  {row.usdPerPersonInNeed > 0 ? `$${row.usdPerPersonInNeed.toFixed(0)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
