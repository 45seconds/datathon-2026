# Predictions Tab Implementation Plan

## Overview
Implement a "Predictions" tab in a Next.js dashboard that displays ML-powered 2027 humanitarian funding gap forecasts. The tab should show three-scenario planning (optimistic, baseline, pessimistic), animated visualizations, and risk analysis for 12 countries.

---

## Project Structure

```
dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── predictions/
│   │   │       └── route.ts          [NEW - API endpoint]
│   │   └── page.tsx                  [MODIFY - add tab render]
│   └── components/
│       ├── PredictionsView.tsx       [NEW - main component]
│       ├── AnimatedCounter.tsx       [NEW - helper]
│       ├── RiskRadarChart.tsx        [NEW - helper]
│       ├── Navbar.tsx                [MODIFY - add tab button]
│       └── index.ts                  [MODIFY - add exports]
```

---

## Step 1: Create API Route

**File:** `dashboard/src/app/api/predictions/route.ts`

This endpoint provides prediction data. In production, this would call your ML model. For now, use mock data that matches the notebook's output structure.

```typescript
import { NextRequest, NextResponse } from 'next/server';

export interface PredictionScenario {
  requirement: number;
  gap: number;
  inNeed: number;
  coverage: number;
  severity: number;
}

export interface CountryPrediction {
  country: string;
  iso3: string;
  baseline: PredictionScenario;
  optimistic: PredictionScenario;
  pessimistic: PredictionScenario;
  priorityScore: number;
  riskScore: number;
  scenarioVariance: number;
}

export interface PredictionSummary {
  totalBaselineRequirement: number;
  totalBaselineGap: number;
  totalOptimisticGap: number;
  totalPessimisticGap: number;
  averageCoverage: number;
  totalPeopleAffected: number;
  criticalCountries: number;
  highPriorityCountries: number;
  modelAccuracy: number;
  modelR2Score: number;
}

const PREDICTIONS: CountryPrediction[] = [
  {
    country: 'Sudan',
    iso3: 'SDN',
    baseline: { requirement: 4.52e9, gap: 3.61e9, inNeed: 15.2e6, coverage: 0.20, severity: 4.5 },
    optimistic: { requirement: 3.98e9, gap: 2.79e9, inNeed: 14.9e6, coverage: 0.30, severity: 4.3 },
    pessimistic: { requirement: 5.34e9, gap: 4.81e9, inNeed: 17.0e6, coverage: 0.10, severity: 4.7 },
    priorityScore: 0.92,
    riskScore: 13.1,
    scenarioVariance: 0.56
  },
  {
    country: 'Afghanistan',
    iso3: 'AFG',
    baseline: { requirement: 3.87e9, gap: 3.09e9, inNeed: 12.8e6, coverage: 0.20, severity: 4.2 },
    optimistic: { requirement: 3.45e9, gap: 2.42e9, inNeed: 12.5e6, coverage: 0.30, severity: 4.0 },
    pessimistic: { requirement: 4.52e9, gap: 4.07e9, inNeed: 14.3e6, coverage: 0.10, severity: 4.4 },
    priorityScore: 0.88,
    riskScore: 10.4,
    scenarioVariance: 0.53
  },
  {
    country: 'Yemen',
    iso3: 'YEM',
    baseline: { requirement: 3.21e9, gap: 2.57e9, inNeed: 11.4e6, coverage: 0.20, severity: 4.1 },
    optimistic: { requirement: 2.89e9, gap: 2.02e9, inNeed: 11.2e6, coverage: 0.30, severity: 3.9 },
    pessimistic: { requirement: 3.78e9, gap: 3.40e9, inNeed: 12.8e6, coverage: 0.10, severity: 4.3 },
    priorityScore: 0.85,
    riskScore: 8.4,
    scenarioVariance: 0.54
  },
  {
    country: 'Ethiopia',
    iso3: 'ETH',
    baseline: { requirement: 2.98e9, gap: 2.38e9, inNeed: 12.2e6, coverage: 0.20, severity: 3.8 },
    optimistic: { requirement: 2.68e9, gap: 1.88e9, inNeed: 12.0e6, coverage: 0.30, severity: 3.6 },
    pessimistic: { requirement: 3.51e9, gap: 3.16e9, inNeed: 13.7e6, coverage: 0.10, severity: 4.0 },
    priorityScore: 0.78,
    riskScore: 7.2,
    scenarioVariance: 0.54
  },
  {
    country: 'Somalia',
    iso3: 'SOM',
    baseline: { requirement: 2.45e9, gap: 1.96e9, inNeed: 7.3e6, coverage: 0.20, severity: 4.0 },
    optimistic: { requirement: 2.21e9, gap: 1.55e9, inNeed: 7.2e6, coverage: 0.30, severity: 3.8 },
    pessimistic: { requirement: 2.88e9, gap: 2.59e9, inNeed: 8.2e6, coverage: 0.10, severity: 4.2 },
    priorityScore: 0.82,
    riskScore: 6.3,
    scenarioVariance: 0.53
  },
  {
    country: 'Syria',
    iso3: 'SYR',
    baseline: { requirement: 2.31e9, gap: 1.85e9, inNeed: 9.1e6, coverage: 0.20, severity: 3.9 },
    optimistic: { requirement: 2.08e9, gap: 1.46e9, inNeed: 8.9e6, coverage: 0.30, severity: 3.7 },
    pessimistic: { requirement: 2.72e9, gap: 2.45e9, inNeed: 10.2e6, coverage: 0.10, severity: 4.1 },
    priorityScore: 0.75,
    riskScore: 5.8,
    scenarioVariance: 0.54
  },
  {
    country: 'Congo (DRC)',
    iso3: 'COD',
    baseline: { requirement: 2.15e9, gap: 1.72e9, inNeed: 8.8e6, coverage: 0.20, severity: 3.7 },
    optimistic: { requirement: 1.94e9, gap: 1.36e9, inNeed: 8.6e6, coverage: 0.30, severity: 3.5 },
    pessimistic: { requirement: 2.53e9, gap: 2.28e9, inNeed: 9.9e6, coverage: 0.10, severity: 3.9 },
    priorityScore: 0.72,
    riskScore: 5.1,
    scenarioVariance: 0.53
  },
  {
    country: 'South Sudan',
    iso3: 'SSD',
    baseline: { requirement: 1.98e9, gap: 1.58e9, inNeed: 7.9e6, coverage: 0.20, severity: 4.0 },
    optimistic: { requirement: 1.78e9, gap: 1.25e9, inNeed: 7.7e6, coverage: 0.30, severity: 3.8 },
    pessimistic: { requirement: 2.33e9, gap: 2.10e9, inNeed: 8.8e6, coverage: 0.10, severity: 4.2 },
    priorityScore: 0.76,
    riskScore: 5.0,
    scenarioVariance: 0.54
  },
  {
    country: 'Nigeria',
    iso3: 'NGA',
    baseline: { requirement: 1.87e9, gap: 1.50e9, inNeed: 8.2e6, coverage: 0.20, severity: 3.6 },
    optimistic: { requirement: 1.68e9, gap: 1.18e9, inNeed: 8.0e6, coverage: 0.30, severity: 3.4 },
    pessimistic: { requirement: 2.20e9, gap: 1.98e9, inNeed: 9.2e6, coverage: 0.10, severity: 3.8 },
    priorityScore: 0.68,
    riskScore: 4.3,
    scenarioVariance: 0.53
  },
  {
    country: 'Myanmar',
    iso3: 'MMR',
    baseline: { requirement: 1.65e9, gap: 1.32e9, inNeed: 5.5e6, coverage: 0.20, severity: 3.5 },
    optimistic: { requirement: 1.49e9, gap: 1.04e9, inNeed: 5.4e6, coverage: 0.30, severity: 3.3 },
    pessimistic: { requirement: 1.94e9, gap: 1.75e9, inNeed: 6.2e6, coverage: 0.10, severity: 3.7 },
    priorityScore: 0.65,
    riskScore: 3.7,
    scenarioVariance: 0.54
  },
  {
    country: 'Palestine',
    iso3: 'PSE',
    baseline: { requirement: 1.54e9, gap: 1.23e9, inNeed: 4.9e6, coverage: 0.20, severity: 3.8 },
    optimistic: { requirement: 1.39e9, gap: 0.97e9, inNeed: 4.8e6, coverage: 0.30, severity: 3.6 },
    pessimistic: { requirement: 1.81e9, gap: 1.63e9, inNeed: 5.5e6, coverage: 0.10, severity: 4.0 },
    priorityScore: 0.70,
    riskScore: 3.7,
    scenarioVariance: 0.54
  },
  {
    country: 'Haiti',
    iso3: 'HTI',
    baseline: { requirement: 1.42e9, gap: 1.14e9, inNeed: 4.7e6, coverage: 0.20, severity: 3.4 },
    optimistic: { requirement: 1.28e9, gap: 0.90e9, inNeed: 4.6e6, coverage: 0.30, severity: 3.2 },
    pessimistic: { requirement: 1.67e9, gap: 1.50e9, inNeed: 5.3e6, coverage: 0.10, severity: 3.6 },
    priorityScore: 0.62,
    riskScore: 3.1,
    scenarioVariance: 0.53
  },
];

const SUMMARY: PredictionSummary = {
  totalBaselineRequirement: PREDICTIONS.reduce((sum, p) => sum + p.baseline.requirement, 0),
  totalBaselineGap: PREDICTIONS.reduce((sum, p) => sum + p.baseline.gap, 0),
  totalOptimisticGap: PREDICTIONS.reduce((sum, p) => sum + p.optimistic.gap, 0),
  totalPessimisticGap: PREDICTIONS.reduce((sum, p) => sum + p.pessimistic.gap, 0),
  averageCoverage: PREDICTIONS.reduce((sum, p) => sum + p.baseline.coverage, 0) / PREDICTIONS.length,
  totalPeopleAffected: PREDICTIONS.reduce((sum, p) => sum + p.baseline.inNeed, 0),
  criticalCountries: PREDICTIONS.filter(p => p.priorityScore > 0.8).length,
  highPriorityCountries: PREDICTIONS.filter(p => p.priorityScore > 0.6 && p.priorityScore <= 0.8).length,
  modelAccuracy: 0.877,
  modelR2Score: 0.8567
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';

  await new Promise(resolve => setTimeout(resolve, 100));

  if (type === 'summary') {
    return NextResponse.json(SUMMARY);
  }

  if (type === 'countries') {
    return NextResponse.json(PREDICTIONS);
  }

  return NextResponse.json({
    summary: SUMMARY,
    countries: PREDICTIONS
  });
}
```

---

## Step 2: Create AnimatedCounter Component

**File:** `dashboard/src/components/AnimatedCounter.tsx`

Smooth counting animation for statistics.

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({ 
  end, 
  duration = 2000, 
  prefix = '', 
  suffix = '',
  decimals = 0,
  className = ''
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = null;
    countRef.current = 0;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - percentage, 4);
      const current = Math.floor(easeOutQuart * end);
      
      countRef.current = current;
      setCount(current);

      if (percentage < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  const formattedCount = decimals > 0 ? count.toFixed(decimals) : count.toString();

  return (
    <span className={className}>
      {prefix}{formattedCount}{suffix}
    </span>
  );
}
```

---

## Step 3: Create RiskRadarChart Component

**File:** `dashboard/src/components/RiskRadarChart.tsx`

SVG-based radar chart with animations.

```typescript
'use client';

import { useEffect, useState } from 'react';

interface RadarData {
  label: string;
  value: number;
  color: string;
}

interface RiskRadarChartProps {
  data: RadarData[];
  country: string;
  size?: number;
}

export function RiskRadarChart({ data, country, size = 200 }: RiskRadarChartProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, [data]);

  const center = size / 2;
  const radius = size / 2 - 30;
  const angleStep = (2 * Math.PI) / data.length;

  const points = data.map((item, index) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = animated ? radius * item.value : 0;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle, item };
  });

  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="flex flex-col items-center">
      <h4 className="text-sm font-medium text-neutral-900 mb-4">{country}</h4>
      
      <svg width={size} height={size} className="overflow-visible">
        {gridLevels.map((level, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius * level}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
            strokeDasharray={i === gridLevels.length - 1 ? "0" : "3 3"}
          />
        ))}

        {points.map((point, i) => {
          const endX = center + radius * Math.cos(point.angle);
          const endY = center + radius * Math.sin(point.angle);
          
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={endX}
              y2={endY}
              stroke="#d1d5db"
              strokeWidth="1"
            />
          );
        })}

        <defs>
          <radialGradient id={`radarGradient-${country}`}>
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.15)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.02)" />
          </radialGradient>
        </defs>
        
        <polygon
          points={polygonPoints}
          fill={`url(#radarGradient-${country})`}
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeOpacity="0.6"
          className="transition-all duration-1000 ease-out"
          style={{ opacity: animated ? 1 : 0 }}
        />

        {points.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#3b82f6"
              className="transition-all duration-700 ease-out"
              style={{
                opacity: animated ? 1 : 0,
                transitionDelay: `${i * 100}ms`
              }}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              className="transition-all duration-700 ease-out"
              style={{
                opacity: animated ? 0.3 : 0,
                transitionDelay: `${i * 100}ms`
              }}
            >
              <animate
                attributeName="r"
                from="6"
                to="10"
                dur="2s"
                begin={`${(i * 100) / 1000}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                from="0.3"
                to="0"
                dur="2s"
                begin={`${(i * 100) / 1000}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}

        {points.map((point, i) => {
          const labelRadius = radius + 20;
          const labelX = center + labelRadius * Math.cos(point.angle);
          const labelY = center + labelRadius * Math.sin(point.angle);
          
          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          if (labelX < center - 5) textAnchor = 'end';
          else if (labelX > center + 5) textAnchor = 'start';

          return (
            <g key={i}>
              <text
                x={labelX}
                y={labelY}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                className="text-xs font-medium fill-neutral-600 transition-opacity duration-500"
                style={{
                  opacity: animated ? 1 : 0,
                  transitionDelay: `${i * 50}ms`
                }}
              >
                {point.item.label}
              </text>
              <text
                x={labelX}
                y={labelY + 12}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                className="text-xs font-semibold fill-neutral-900 transition-opacity duration-500"
                style={{
                  opacity: animated ? 1 : 0,
                  transitionDelay: `${i * 50 + 100}ms`
                }}
              >
                {(point.item.value * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {data.map((item, i) => (
          <div 
            key={i}
            className="flex items-center gap-1.5 transition-opacity duration-500"
            style={{
              opacity: animated ? 1 : 0,
              transitionDelay: `${i * 100 + 500}ms`
            }}
          >
            <div className={`h-2 w-2 rounded-full ${item.color}`}></div>
            <span className="text-xs text-neutral-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Step 4: Create Main PredictionsView Component

**File:** `dashboard/src/components/PredictionsView.tsx`

Main dashboard view with all sections.

```typescript
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
                  decimals={0}
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
              <p className="mt-1 text-xs text-neutral-400">Priority score &gt; 0.8</p>
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
```

---

## Step 5: Update Component Exports

**File:** `dashboard/src/components/index.ts`

Add these three lines at the end:

```typescript
export { PredictionsView } from './PredictionsView';
export { AnimatedCounter } from './AnimatedCounter';
export { RiskRadarChart } from './RiskRadarChart';
```

---

## Step 6: Update Navbar

**File:** `dashboard/src/components/Navbar.tsx`

Add a Predictions tab button. Find where other tab buttons are defined and add:

```typescript
<button
  onClick={() => handleTabClick('predictions')}
  className={`px-3 py-1.5 text-sm transition-colors ${
    activeTab === 'predictions' 
      ? 'text-neutral-900' 
      : 'text-neutral-500 hover:text-neutral-900'
  }`}
>
  Predictions
</button>
```

Make sure the `handleTabClick` function and `activeTab` state handle 'predictions' as a valid tab value.

---

## Step 7: Update Main Page

**File:** `dashboard/src/app/page.tsx`

1. **Add to imports:**
```typescript
import { ..., PredictionsView } from '@/components';
```

2. **Add conditional render** (place it with other tab renders like maps, datasets, etc.):
```typescript
{/* Predictions Tab */}
{activeTab === 'predictions' && <PredictionsView />}
```

---

## Step 8: Ensure Dependencies

The implementation requires:

1. **Flags utility** (`@/lib/flags.ts`):
```typescript
export function getCountryFlag(iso3: string): string {
  const flags: Record<string, string> = {
    'SDN': '🇸🇩', 'AFG': '🇦🇫', 'YEM': '🇾🇪', 'ETH': '🇪🇹',
    'SOM': '🇸🇴', 'SYR': '🇸🇾', 'COD': '🇨🇩', 'SSD': '🇸🇸',
    'NGA': '🇳🇬', 'MMR': '🇲🇲', 'PSE': '🇵🇸', 'HTI': '🇭🇹'
  };
  return flags[iso3] || '🏳️';
}
```

2. **Tailwind CSS** configured with neutral color palette
3. **React 18+** and **Next.js 14+**

---

## ML Model Context (from Notebook)

The predictions are based on a Random Forest model with the following approach:

### Features Used:
1. **Log-transformed variables**: `log_in_need`, `log_population`, `log_severity`
2. **Engineered features**: 
   - `severity_x_need` (interaction term)
   - `efficiency_score` (req_sum / in_need ratio)
   - `coverage_deficit` (1 - coverage_rate)
3. **Temporal features**: Year, lag features for trends
4. **Regional features**: Geographic indicators

### Model Pipeline:
- Hyperparameter optimization using **Optuna** (75 trials, TPE sampler)
- Best model: RandomForestRegressor with tuned n_estimators, max_depth, min_samples_split
- Target: `log_req_sum` (log of total funding requirements)
- Gap calculation: `gap = requirement × (1 - expected_coverage)`

### Scenario Generation:
- **Optimistic**: Assumes 30% coverage improvement
- **Baseline**: Uses median historical coverage (20%)
- **Pessimistic**: Assumes coverage deterioration to 10%

### Priority Scoring (Multi-factor):
```python
priority_score = (
    0.35 * (gap / max_gap) +              # 35% weight on absolute gap
    0.25 * (severity / 5.0) +              # 25% weight on severity
    0.20 * (in_need / max_in_need) +      # 20% weight on people affected
    0.20 * (1 - coverage)                  # 20% weight on coverage deficit
)
```

### Risk Score:
```python
risk_score = (
    gap / 1e9 +                            # Absolute gap in billions
    severity * 1.5 +                       # Severity multiplier
    (in_need / 1e6) * 0.3 +               # Population affected factor
    scenario_variance * 10                 # Uncertainty premium
)
```

---

## Testing Checklist

After implementation, verify:

- [ ] API returns data at `/api/predictions?type=summary`
- [ ] API returns data at `/api/predictions?type=countries`
- [ ] Predictions tab button appears in navbar
- [ ] Clicking Predictions shows the dashboard
- [ ] All 4 stat cards animate correctly
- [ ] Top 4 radar charts render with proper gradients
- [ ] All 12 country cards appear
- [ ] Country cards expand/collapse on click
- [ ] Expanded view shows 3 scenarios correctly
- [ ] No console errors or TypeScript errors
- [ ] UI matches neutral color scheme of dashboard
- [ ] Responsive design works on different screen sizes

---

## Design Principles

1. **Clean & Minimal**: Neutral color palette (grays, blacks, whites)
2. **Consistent Typography**: Use existing font classes
3. **Smooth Animations**: Easing functions for professional feel
4. **Data-Driven**: All numbers should be real and meaningful
5. **Responsive**: Works on mobile, tablet, desktop
6. **Accessible**: Proper ARIA labels, keyboard navigation

---

## Notes for Production

- Replace mock PREDICTIONS data with actual ML model API calls
- Add error boundaries for graceful failure handling
- Implement data caching/revalidation strategy
- Add loading skeletons instead of simple spinner
- Consider server-side rendering for initial data
- Add export functionality (CSV, PDF reports)
- Implement filtering/sorting options for countries
- Add historical comparison views

---

End of Implementation Plan
