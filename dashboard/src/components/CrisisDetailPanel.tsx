'use client';

import { useEffect, useState } from 'react';
import type { CrisisDetail } from '@/types';
import { getCountryFlag } from '@/lib/flags';

interface CrisisDetailPanelProps {
  iso3: string | null;
  year: number;
  onClose: () => void;
  onAskAI?: (iso3: string, name: string, context: string) => void;
}

const CLUSTER_NAMES: Record<string, string> = {
  'PRO': 'Protection',
  'FSC': 'Food Security',
  'NUT': 'Nutrition',
  'HEA': 'Health',
  'WSH': 'WASH',
  'SHL': 'Shelter',
  'EDU': 'Education',
  'ERL': 'Early Recovery',
};

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toFixed(0);
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(0)}M`;
  return `$${formatNumber(num)}`;
}

function formatDriver(driver: string): string {
  if (!driver || driver.trim() === '') return 'Unknown';
  
  // Split by comma first, then process each part
  const parts = driver.split(',').map(p => p.trim()).filter(Boolean);
  
  const formattedParts = parts.map(part => {
    // Add spaces around "/" if missing
    let formatted = part.replace(/\/(?=\S)/g, ' / ').replace(/(?<=\S)\//g, ' / ');
    
    // Capitalize words (title case)
    formatted = formatted
      .toLowerCase()
      .split(' ')
      .map(word => {
        // Handle special cases like "and", "or", "of" - keep lowercase unless first word
        const smallWords = ['and', 'or', 'of', 'the', 'a', 'an'];
        if (smallWords.includes(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
    
    // Capitalize first letter of the whole part
    if (formatted.length > 0) {
      formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    
    return formatted;
  });
  
  // Join with proper comma spacing
  return formattedParts.join(', ');
}

function buildContextString(detail: CrisisDetail, year: number): string {
  const lines = [
    `Country: ${detail.country} (${detail.region})`,
    `Year: ${year}`,
    `Population in Need: ${detail.currentMetrics.inNeed.toLocaleString()} (${(detail.currentMetrics.needRate * 100).toFixed(1)}% of population)`,
    `Coverage Rate: ${(detail.currentMetrics.coverageRate * 100).toFixed(1)}%`,
    `Funding: $${detail.currentMetrics.revisedRequirements.toLocaleString()} ($${detail.currentMetrics.usdPerPersonInNeed.toFixed(0)}/person)`,
    `Mismatch: ${detail.currentMetrics.mismatch > 0 ? '+' : ''}${(detail.currentMetrics.mismatch * 100).toFixed(0)}%`,
  ];

  if (detail.severity) {
    lines.push(`Severity Index: ${detail.severity.severityIndex.toFixed(1)}/5.0`);
    lines.push(`Crisis Type: ${detail.severity.crisisType}`);
    lines.push(`Primary Driver: ${formatDriver(detail.severity.primaryDriver)}`);
  }

  if (detail.timeline) {
    lines.push(`First Response: ${detail.timeline.firstResponseDate}`);
    lines.push(`Years of Response: ${detail.timeline.yearsSinceFirstResponse.toFixed(1)}`);
  }

  return lines.join('\n');
}

export function CrisisDetailPanel({ iso3, year, onClose, onAskAI }: CrisisDetailPanelProps) {
  const [detail, setDetail] = useState<CrisisDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!iso3) {
      setDetail(null);
      return;
    }

    setLoading(true);
    fetch(`/api/crisis-detail?iso3=${iso3}&year=${year}`)
      .then((res) => res.ok ? res.json() : null)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [iso3, year]);

  if (!iso3) return null;

  return (
    <div className="fixed right-0 top-12 z-50 h-[calc(100vh-48px)] w-[400px] overflow-y-auto border-l border-neutral-200 bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          {detail && (
            <>
              <span className="text-2xl">{getCountryFlag(iso3)}</span>
              <div>
                <h2 className="font-medium text-neutral-900">{detail.country}</h2>
                <p className="text-xs text-neutral-500">{detail.region} · {iso3}</p>
              </div>
            </>
          )}
        </div>
        <button onClick={onClose} className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        {loading && <p className="py-8 text-center text-sm text-neutral-400">Loading...</p>}

        {detail && !loading && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <section>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
                Key Metrics ({year})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border border-neutral-100 p-3">
                  <p className="text-xs text-neutral-500">In Need</p>
                  <p className="text-xl font-semibold tabular-nums text-neutral-900">
                    {formatNumber(detail.currentMetrics.inNeed)}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {(detail.currentMetrics.needRate * 100).toFixed(0)}% of pop
                  </p>
                </div>
                <div className="rounded border border-neutral-100 p-3">
                  <p className="text-xs text-neutral-500">Coverage</p>
                  <p className="text-xl font-semibold tabular-nums text-neutral-900">
                    {(detail.currentMetrics.coverageRate * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-neutral-400">
                    {formatNumber(detail.currentMetrics.targeted)} targeted
                  </p>
                </div>
                <div className="rounded border border-neutral-100 p-3">
                  <p className="text-xs text-neutral-500">Funding</p>
                  <p className="text-xl font-semibold tabular-nums text-neutral-900">
                    {formatCurrency(detail.currentMetrics.revisedRequirements)}
                  </p>
                  <p className="text-xs text-neutral-400">
                    ${detail.currentMetrics.usdPerPersonInNeed.toFixed(0)}/person
                  </p>
                </div>
                <div className="rounded border border-neutral-100 p-3">
                  <p className="text-xs text-neutral-500">Mismatch</p>
                  <p className="text-xl font-semibold tabular-nums text-neutral-900">
                    {detail.currentMetrics.mismatch > 0 ? '+' : ''}{(detail.currentMetrics.mismatch * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-neutral-400">
                    {detail.currentMetrics.mismatch > 0 ? 'Underserved' : 'Adequate'}
                  </p>
                </div>
              </div>
            </section>

            {/* INFORM Severity */}
            {detail.severity && (
              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Crisis Severity
                </h3>
                <div className="rounded border border-neutral-100 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-semibold text-neutral-900">
                      {detail.severity.severityIndex.toFixed(1)}
                    </span>
                    <span className="text-xs text-neutral-500">/ 5.0</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-500">Type</span>
                      <p className="text-neutral-900">{detail.severity.crisisType}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Driver</span>
                      <p className="text-neutral-900">{formatDriver(detail.severity.primaryDriver)}</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Sector Gaps */}
            {detail.sectorGaps.length > 0 && (
              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Sector Coverage
                </h3>
                <div className="space-y-2">
                  {detail.sectorGaps.slice(0, 5).map((gap) => (
                    <div key={gap.cluster} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-600">
                        {CLUSTER_NAMES[gap.cluster] || gap.cluster}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-neutral-900"
                            style={{ width: `${Math.min(gap.coverageRate * 100, 100)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right tabular-nums text-neutral-500">
                          {(gap.coverageRate * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Timeline */}
            {detail.timeline && (
              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Timeline
                </h3>
                <div className="rounded border border-neutral-100 p-4 text-sm">
                  <p className="text-neutral-500">First response plan</p>
                  <p className="text-neutral-900">{detail.timeline.firstResponseDate}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {detail.timeline.yearsSinceFirstResponse.toFixed(1)} years of response
                  </p>
                </div>
              </section>
            )}

            {/* Sources */}
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
                Sources
              </h3>
              <div className="text-xs text-neutral-500">
                {detail.sources.map((s) => s.name).join(' · ')}
              </div>
            </section>

            {/* Ask AI About This Country */}
            {onAskAI && (
              <section className="pt-4 border-t border-neutral-100">
                <button
                  onClick={() => {
                    const context = buildContextString(detail, year);
                    onAskAI(iso3!, detail.country, context);
                  }}
                  className="w-full flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-left transition-colors hover:bg-neutral-100 hover:border-neutral-300"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                    <svg className="h-4 w-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">Ask AI about {detail.country}</p>
                    <p className="text-xs text-neutral-500">Get insights using crisis context</p>
                  </div>
                  <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
