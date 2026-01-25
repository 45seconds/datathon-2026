'use client';

import { useEffect, useState } from 'react';
import { getCountryFlag } from '@/lib/flags';
import { AnimatedCounter } from './AnimatedCounter';
import { RiskRadarChart } from './RiskRadarChart';

interface PredictionScenario {
  requirement: number;
  gap: number;
  inNeed: number;
  coverage: number;
  severity: number;
}

interface CountryPrediction {
  iso3: string;
  country: string;
  baseline: PredictionScenario;
  optimistic: PredictionScenario;
  pessimistic: PredictionScenario;
  priorityScore: number;
  riskScore: number;
  scenarioVariance: number;
}

interface PredictionSummary {
  totalBaselineGap: number;
  totalBaselineRequirement: number;
  totalOptimisticGap: number;
  totalPessimisticGap: number;
  totalPeopleAffected: number;
  criticalCountries: number;
  averageCoverage: number;
  modelAccuracy: number;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toFixed(0);
}

function formatCurrency(num: number): string {
  const formatNumber = (n: number) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    return `${n.toFixed(0)}`;
  };
  return `$${formatNumber(num)}`;
}

export function PredictionsView() {
  const [summary, setSummary] = useState<PredictionSummary | null>(null);
  const [predictions, setPredictions] = useState<CountryPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, countriesRes] = await Promise.all([
          fetch('/api/predictions?type=summary'),
          fetch('/api/predictions?type=countries'),
        ]);
        setSummary(await summaryRes.json());
        setPredictions(await countriesRes.json());
      } catch (error) {
        console.error('Failed to fetch predictions:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 mx-auto"></div>
          <p className="mt-3 text-sm text-neutral-500">Loading predictions...</p>
        </div>
      </div>
    );
  }

  if (!summary || predictions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">No prediction data available</p>
      </div>
    );
  }

  const maxGap = Math.max(...predictions.map(p => p.baseline.gap));

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="border-b border-neutral-100">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            2027 Funding Gap Predictions
          </h1>
          <p className="mt-3 max-w-2xl text-neutral-500">
            ML-powered forecasts with three-scenario planning and strategic resource allocation guidance.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-neutral-100">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-4 divide-x divide-neutral-100">
            <div className="px-6 py-8">
              <p className="text-sm text-neutral-500">Baseline Gap</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums text-neutral-900">
                <AnimatedCounter 
                  end={summary.totalBaselineGap / 1e9} 
                  decimals={1}
                  prefix="$"
                  suffix="B"
                  duration={2000}
                />
              </p>
              <p className="mt-1 text-xs text-neutral-400">Unmet needs</p>
            </div>
            <div className="px-6 py-8">
              <p className="text-sm text-neutral-500">People Affected</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums text-neutral-900">
                <AnimatedCounter 
                  end={summary.totalPeopleAffected / 1e6} 
                  decimals={1}
                  suffix="M"
                  duration={2000}
                />
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                <AnimatedCounter 
                  end={summary.averageCoverage * 100} 
                  decimals={2}
                  suffix="% avg coverage"
                  duration={2000}
                />
              </p>
            </div>
            <div className="px-6 py-8">
              <p className="text-sm text-neutral-500">Critical Countries</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums text-neutral-900">
                <AnimatedCounter 
                  end={summary.criticalCountries} 
                  decimals={0}
                  duration={2000}
                />
              </p>
              <p className="mt-1 text-xs text-neutral-400">Priority score &gt; 0.7</p>
            </div>
            <div className="px-6 py-8">
              <p className="text-sm text-neutral-500">Scenario Range</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums text-neutral-900">
                <AnimatedCounter 
                  end={(summary.totalPessimisticGap - summary.totalOptimisticGap) / 1e9} 
                  decimals={1}
                  prefix="$"
                  suffix="B"
                  duration={2000}
                />
              </p>
              <p className="mt-1 text-xs text-neutral-400">Best to worst case</p>
            </div>
          </div>
        </div>
      </section>

      {/* Risk Analysis */}
      <section className="border-b border-neutral-100">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="text-lg font-medium text-neutral-900">Multi-Dimensional Risk Analysis</h2>
          <p className="mt-1 text-sm text-neutral-500">Top 4 countries by priority score</p>
          
          <div className="mt-6 grid grid-cols-4 gap-6">
            {predictions.slice(0, 4).map(pred => (
              <div key={pred.iso3} className="rounded-lg border border-neutral-100 bg-white p-4">
                <RiskRadarChart
                  country={pred.country}
                  size={180}
                  data={[
                    { label: 'Gap', value: pred.baseline.gap / maxGap, color: 'bg-red-500' },
                    { label: 'Severity', value: pred.baseline.severity / 5, color: 'bg-orange-500' },
                    { label: 'Need', value: Math.min(pred.baseline.inNeed / 20e6, 1), color: 'bg-yellow-500' },
                    { label: 'Priority', value: pred.priorityScore, color: 'bg-purple-500' },
                    { label: 'Risk', value: Math.min(pred.riskScore / 15, 1), color: 'bg-pink-500' }
                  ]}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Country Forecasts */}
      <section className="border-b border-neutral-100">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="text-lg font-medium text-neutral-900">Country Forecasts</h2>
          <p className="mt-1 text-sm text-neutral-500">2027 predictions sorted by priority</p>
          
          <div className="mt-6 space-y-3">
            {predictions.map((pred, index) => {
              const barWidth = (pred.baseline.gap / maxGap) * 100;
              const isExpanded = expandedCountry === pred.iso3;
              
              return (
                <div 
                  key={pred.iso3} 
                  className="rounded-lg border border-neutral-100 bg-white transition-all hover:border-neutral-300 hover:shadow-sm"
                >
                  <button
                    onClick={() => setExpandedCountry(isExpanded ? null : pred.iso3)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded text-xs font-medium text-neutral-500 bg-neutral-50">
                          {index + 1}
                        </span>
                        <span className="text-xl">{getCountryFlag(pred.iso3)}</span>
                        <div>
                          <h3 className="font-medium text-neutral-900">{pred.country}</h3>
                          <p className="text-xs text-neutral-500">
                            {formatNumber(pred.baseline.inNeed)} people in need
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold tabular-nums text-neutral-900">
                            {formatCurrency(pred.baseline.gap)}
                          </p>
                          <p className="text-xs text-neutral-500">baseline gap</p>
                        </div>
                        <svg 
                          className={`h-5 w-5 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full bg-neutral-900 transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      ></div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-neutral-100 p-4 bg-neutral-50">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="rounded-lg border border-neutral-200 bg-white p-3">
                          <p className="text-xs text-neutral-500 mb-1">Best Case</p>
                          <p className="text-lg font-semibold text-neutral-900">{formatCurrency(pred.optimistic.gap)}</p>
                          <p className="text-xs text-neutral-500 mt-1">{(pred.optimistic.coverage * 100).toFixed(0)}% coverage</p>
                        </div>
                        <div className="rounded-lg border border-neutral-200 bg-white p-3">
                          <p className="text-xs text-neutral-500 mb-1">Baseline</p>
                          <p className="text-lg font-semibold text-neutral-900">{formatCurrency(pred.baseline.gap)}</p>
                          <p className="text-xs text-neutral-500 mt-1">{(pred.baseline.coverage * 100).toFixed(0)}% coverage</p>
                        </div>
                        <div className="rounded-lg border border-neutral-200 bg-white p-3">
                          <p className="text-xs text-neutral-500 mb-1">Worst Case</p>
                          <p className="text-lg font-semibold text-neutral-900">{formatCurrency(pred.pessimistic.gap)}</p>
                          <p className="text-xs text-neutral-500 mt-1">{(pred.pessimistic.coverage * 100).toFixed(0)}% coverage</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-xs">
                        <div className="rounded-lg border border-neutral-200 bg-white p-2">
                          <span className="text-neutral-500">Severity</span>
                          <p className="mt-0.5 font-medium text-neutral-900">{pred.baseline.severity.toFixed(1)}/5.0</p>
                        </div>
                        <div className="rounded-lg border border-neutral-200 bg-white p-2">
                          <span className="text-neutral-500">Priority</span>
                          <p className="mt-0.5 font-medium text-neutral-900">{pred.priorityScore.toFixed(2)}</p>
                        </div>
                        <div className="rounded-lg border border-neutral-200 bg-white p-2">
                          <span className="text-neutral-500">Risk Score</span>
                          <p className="mt-0.5 font-medium text-neutral-900">{pred.riskScore.toFixed(1)}</p>
                        </div>
                        <div className="rounded-lg border border-neutral-200 bg-white p-2">
                          <span className="text-neutral-500">Uncertainty</span>
                          <p className="mt-0.5 font-medium text-neutral-900">{(pred.scenarioVariance * 100).toFixed(2)}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
