import { CountryCrisisMetrics } from '@/types';
import { getCountryFlag } from '@/lib/flags';

interface DataTableProps {
  data: CountryCrisisMetrics[];
  title: string;
  description?: string;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

function formatPercent(num: number): string {
  return `${(num * 100).toFixed(0)}%`;
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(0)}M`;
  return `$${formatNumber(num)}`;
}

export function DataTable({ data, title, description }: DataTableProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium text-neutral-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
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
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.iso3}
                className={i < data.length - 1 ? 'border-b border-neutral-100' : ''}
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
                      {formatPercent(row.coverageRate)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-neutral-500">
                  {row.revisedRequirements > 0 ? formatCurrency(row.revisedRequirements) : '—'}
                </td>
                <td className="py-3 pl-4 text-right tabular-nums text-neutral-500">
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
