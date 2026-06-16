'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CrisisDetail } from '@/types';
import { CountryFlag } from './CountryFlag';

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

type SeriesPoint = { year: number; value: number };

function fitLinearTrend(points: SeriesPoint[]): { slope: number; intercept: number } | null {
  if (points.length < 2) return null;
  const n = points.length;
  const sumX = points.reduce((acc, p) => acc + p.year, 0);
  const sumY = points.reduce((acc, p) => acc + p.value, 0);
  const sumXX = points.reduce((acc, p) => acc + p.year * p.year, 0);
  const sumXY = points.reduce((acc, p) => acc + p.year * p.value, 0);

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return null;

  return { slope, intercept };
}

function clampNumber(value: number, clamp?: { min?: number; max?: number }): number {
  let v = value;
  if (typeof clamp?.min === 'number') v = Math.max(clamp.min, v);
  if (typeof clamp?.max === 'number') v = Math.min(clamp.max, v);
  return v;
}

function yearRange(startYear: number, endYear: number): number[] {
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);
  return years;
}

function buildRegression(
  historical: SeriesPoint[],
  startYear: number,
  endYear: number,
  clamp?: { min?: number; max?: number }
): { line: SeriesPoint[]; forecast: SeriesPoint[]; endValue?: number } {
  const hist = [...historical].sort((a, b) => a.year - b.year);
  if (hist.length === 0) return { line: [], forecast: [] };

  const model = hist.length >= 2 ? fitLinearTrend(hist) : { slope: 0, intercept: hist[0].value };
  if (!model) return { line: [], forecast: [] };

  const yrs = yearRange(startYear, endYear);
  const line = yrs
    .map((y) => ({ year: y, value: clampNumber(model.intercept + model.slope * y, clamp) }))
    .filter((p) => Number.isFinite(p.value));

  const lastYear = hist[hist.length - 1].year;
  const forecast = yrs
    .filter((y) => y > lastYear)
    .map((y) => ({ year: y, value: clampNumber(model.intercept + model.slope * y, clamp) }))
    .filter((p) => Number.isFinite(p.value));

  const endValue = clampNumber(model.intercept + model.slope * endYear, clamp);

  return { line, forecast, endValue: Number.isFinite(endValue) ? endValue : undefined };
}

function holtFitAndForecast(
  historical: SeriesPoint[],
  endYear: number,
  clamp?: { min?: number; max?: number }
): { alpha: number; beta: number; forecast: SeriesPoint[]; endValue?: number } | null {
  const hist = [...historical].sort((a, b) => a.year - b.year);
  if (hist.length === 0) return null;

  const lastYear = hist[hist.length - 1].year;
  if (lastYear >= endYear) return { alpha: 0.5, beta: 0.1, forecast: [] };

  // If we only have one point, carry it forward.
  if (hist.length === 1) {
    const forecast = yearRange(lastYear + 1, endYear).map((y) => ({
      year: y,
      value: clampNumber(hist[0].value, clamp),
    }));
    const endValue = forecast[forecast.length - 1]?.value;
    return { alpha: 1, beta: 0, forecast, endValue };
  }

  const y = hist.map((p) => p.value);
  const n = y.length;

  // Grid search for (alpha, beta) minimizing one-step-ahead SSE.
  let best: { alpha: number; beta: number; sse: number } | null = null;
  for (let a = 0.2; a <= 0.9; a += 0.1) {
    for (let b = 0.0; b <= 0.8; b += 0.1) {
      let level = y[0];
      let trend = y[1] - y[0];
      let sse = 0;

      for (let t = 1; t < n; t++) {
        const oneStep = level + trend;
        const err = y[t] - oneStep;
        sse += err * err;

        const nextLevel = a * y[t] + (1 - a) * (level + trend);
        const nextTrend = b * (nextLevel - level) + (1 - b) * trend;
        level = nextLevel;
        trend = nextTrend;
      }

      if (!best || sse < best.sse) {
        best = { alpha: a, beta: b, sse };
      }
    }
  }

  const alpha = best?.alpha ?? 0.6;
  const beta = best?.beta ?? 0.2;

  // Re-run with best params to get final level/trend.
  let level = y[0];
  let trend = y[1] - y[0];
  for (let t = 1; t < n; t++) {
    const nextLevel = alpha * y[t] + (1 - alpha) * (level + trend);
    const nextTrend = beta * (nextLevel - level) + (1 - beta) * trend;
    level = nextLevel;
    trend = nextTrend;
  }

  const forecast = yearRange(lastYear + 1, endYear).map((yr, idx) => {
    const m = idx + 1;
    const value = clampNumber(level + m * trend, clamp);
    return { year: yr, value };
  });

  const endValue = forecast[forecast.length - 1]?.value;
  return { alpha, beta, forecast, endValue: Number.isFinite(endValue) ? endValue : undefined };
}

function ForecastScatterPlot({
  title,
  endYear,
  historical,
  formatValue,
  color,
  clamp,
}: {
  title: string;
  endYear: number;
  historical: SeriesPoint[];
  formatValue: (value: number) => string;
  color: string;
  clamp?: { min?: number; max?: number };
}) {
  const width = 340;
  const height = 96;
  const padL = 46;
  const padR = 10;
  const padT = 12;
  const padB = 22;
  const labelH = 16;
  const svgHeight = height + labelH;

  const hist = [...historical].sort((a, b) => a.year - b.year);
  if (hist.length < 1) return null;

  const startYear = hist[0].year;
  const lastHistYear = hist[hist.length - 1].year;
  const xEndYear = Math.max(endYear, lastHistYear);

  const regression = buildRegression(hist, startYear, xEndYear, clamp);
  const holt = holtFitAndForecast(hist, xEndYear, clamp);
  const holtLine: SeriesPoint[] = holt ? [hist[hist.length - 1], ...holt.forecast] : [];

  const allVals = [
    ...hist.map((p) => p.value),
    ...regression.line.map((p) => p.value),
    ...holtLine.map((p) => p.value),
  ].filter((v) => Number.isFinite(v));

  if (allVals.length < 2) return null;

  let minVal = Math.min(...allVals);
  let maxVal = Math.max(...allVals);
  if (minVal === maxVal) {
    minVal -= 1;
    maxVal += 1;
  }

  const xForYear = (year: number) => {
    if (xEndYear === startYear) return padL;
    const t = (year - startYear) / (xEndYear - startYear);
    return padL + t * (width - padL - padR);
  };

  const yForValue = (value: number) => {
    const t = (value - minVal) / (maxVal - minVal);
    return height - padB - t * (height - padT - padB);
  };

  const toPolyline = (pts: SeriesPoint[]) => pts.map((p) => `${xForYear(p.year)},${yForValue(p.value)}`).join(' ');

  const regLinePoints = regression.line.length >= 2 ? toPolyline(regression.line) : '';
  const holtLinePoints = holtLine.length >= 2 ? toPolyline(holtLine) : '';

  const reg2030 = regression.endValue;
  const ts2030 = holt?.endValue;

  const midVal = (minVal + maxVal) / 2;
  const yTop = yForValue(maxVal);
  const yMid = yForValue(midVal);
  const yBot = yForValue(minVal);

  const xSeparator = xForYear(lastHistYear);
  const xTicks = Array.from(new Set([startYear, lastHistYear, xEndYear])).sort((a, b) => a - b);

  return (
    <div className="rounded border border-neutral-100 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900">{title}</p>
          <p className="text-[11px] text-neutral-500">
            Actual points + regression (solid) + time-series (dashed)
          </p>
        </div>
        {(reg2030 !== undefined || ts2030 !== undefined) && (
          <div className="text-right leading-tight">
            <p className="text-[11px] text-neutral-500">{xEndYear} est.</p>
            <p className="text-[11px] text-neutral-700">
              {reg2030 !== undefined ? `Reg ${formatValue(reg2030)}` : ''}
              {reg2030 !== undefined && ts2030 !== undefined ? ' · ' : ''}
              {ts2030 !== undefined ? `TS ${formatValue(ts2030)}` : ''}
            </p>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${svgHeight}`}
        className="mt-2 h-28 w-full"
        role="img"
        aria-label={`${title} forecast scatterplot`}
      >
        {/* Horizontal grid */}
        <line x1={padL} x2={width - padR} y1={yTop} y2={yTop} stroke="#e5e7eb" strokeWidth={1} />
        <line x1={padL} x2={width - padR} y1={yMid} y2={yMid} stroke="#f3f4f6" strokeWidth={1} />
        <line x1={padL} x2={width - padR} y1={yBot} y2={yBot} stroke="#e5e7eb" strokeWidth={1} />

        {/* Y labels */}
        <text x={6} y={yTop + 3} className="fill-neutral-400 text-[10px]">
          {formatValue(maxVal)}
        </text>
        <text x={6} y={yMid + 3} className="fill-neutral-400 text-[10px]">
          {formatValue(midVal)}
        </text>
        <text x={6} y={yBot + 3} className="fill-neutral-400 text-[10px]">
          {formatValue(minVal)}
        </text>

        {/* Historical/Future separator */}
        <line
          x1={xSeparator}
          x2={xSeparator}
          y1={padT}
          y2={height - padB}
          stroke="#d1d5db"
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {/* Regression line */}
        {regLinePoints && (
          <polyline points={regLinePoints} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
        )}

        {/* Time series (Holt) line */}
        {holtLinePoints && (
          <polyline
            points={holtLinePoints}
            fill="none"
            stroke="#16a34a"
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeDasharray="5 4"
            opacity={0.95}
          />
        )}

        {/* Actual points */}
        {hist.map((p) => (
          <circle key={`a-${p.year}`} cx={xForYear(p.year)} cy={yForValue(p.value)} r={3} fill={color} />
        ))}

        {/* Regression forecast points */}
        {regression.forecast.map((p) => (
          <circle
            key={`r-${p.year}`}
            cx={xForYear(p.year)}
            cy={yForValue(p.value)}
            r={3}
            fill="white"
            stroke={color}
            strokeWidth={2}
            opacity={0.95}
          />
        ))}

        {/* Time-series forecast points */}
        {holt?.forecast.map((p) => (
          <rect
            key={`t-${p.year}`}
            x={xForYear(p.year) - 3}
            y={yForValue(p.value) - 3}
            width={6}
            height={6}
            fill="white"
            stroke="#16a34a"
            strokeWidth={2}
            opacity={0.95}
          />
        ))}

        {/* X labels */}
        {xTicks.map((yr, idx) => (
          <text
            key={`x-${yr}-${idx}`}
            x={xForYear(yr)}
            y={height + labelH - 4}
            textAnchor={yr === startYear ? 'start' : yr === xEndYear ? 'end' : 'middle'}
            className="fill-neutral-400 text-[10px]"
          >
            {yr}
          </text>
        ))}
      </svg>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          Actual
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[2px] w-5 rounded" style={{ backgroundColor: color }} />
          Regression
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[2px] w-5 rounded border-t-2 border-dashed" style={{ borderColor: '#16a34a' }} />
          Time-series (Holt)
        </span>
      </div>
    </div>
  );
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

  const projections = useMemo(() => {
    if (!detail) return null;

    const histInNeed: SeriesPoint[] = (detail.trends || [])
      .map((t) => ({ year: t.year, value: t.inNeed }))
      .filter((p) => Number.isFinite(p.value));

    const histUsdPerPerson: SeriesPoint[] = (detail.trends || [])
      .map((t) => ({ year: t.year, value: t.usdPerPerson }))
      .filter((p) => Number.isFinite(p.value));

    const END_YEAR = 2030;

    return {
      endYear: END_YEAR,
      inNeed: histInNeed,
      usdPerPerson: histUsdPerPerson,
    };
  }, [detail]);

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
              <CountryFlag iso3={iso3} className="h-5 w-8 rounded-sm object-cover" />
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
      <div className="p-4">
        {loading && <p className="py-8 text-center text-sm text-neutral-400">Loading...</p>}

        {detail && !loading && (
          <div className="space-y-5">
            {/* Key Metrics */}
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
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

            {/* Future Projections */}
            {projections && (projections.inNeed.length >= 1 || projections.usdPerPerson.length >= 1) && (
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Future Projections
                </h3>
                <div className="space-y-2">
                  {projections.inNeed.length >= 1 && (
                    <ForecastScatterPlot
                      title="People in Need"
                      endYear={projections.endYear}
                      historical={projections.inNeed}
                      formatValue={(v) => formatNumber(Math.round(v))}
                      color="#dc2626"
                      clamp={{ min: 0 }}
                    />
                  )}

                  {projections.usdPerPerson.length >= 1 && (
                    <ForecastScatterPlot
                      title="USD per Person in Need"
                      endYear={projections.endYear}
                      historical={projections.usdPerPerson}
                      formatValue={(v) => `$${Math.max(0, Math.round(v)).toLocaleString()}`}
                      color="#2563eb"
                      clamp={{ min: 0 }}
                    />
                  )}
                </div>
                <p className="mt-2 text-xs text-neutral-400">
                  Forecasts use 2024–2026 values with regression and Holt time-series trend.
                </p>
              </section>
            )}

            {/* INFORM Severity */}
            {detail.severity && (
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
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
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
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
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
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
