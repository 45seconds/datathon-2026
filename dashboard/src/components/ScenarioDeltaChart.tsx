'use client';

import { useEffect, useState } from 'react';

interface ScenarioDeltaChartProps {
  baseline: number;
  optimistic: number;
  pessimistic: number;
  label: string;
  format?: (n: number) => string;
}

export function ScenarioDeltaChart({ 
  baseline, 
  optimistic, 
  pessimistic, 
  label,
  format = (n) => `$${(n/1e9).toFixed(1)}B`
}: ScenarioDeltaChartProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, [baseline, optimistic, pessimistic]);

  const optimisticDelta = ((optimistic - baseline) / baseline) * 100;
  const pessimisticDelta = ((pessimistic - baseline) / baseline) * 100;

  const getColor = (delta: number) => {
    if (delta < -10) return 'text-green-600';
    if (delta > 10) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getBarColor = (delta: number) => {
    if (delta < -10) return 'bg-green-500';
    if (delta > 10) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-neutral-700">{label}</p>
      
      {/* Baseline */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-neutral-500">Baseline</span>
          <span className="text-sm font-semibold text-neutral-900">{format(baseline)}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-neutral-200">
          <div 
            className={`h-full rounded-full bg-blue-500 transition-all duration-1000 ${animated ? 'opacity-100' : 'opacity-0'}`}
            style={{ 
              width: animated ? '100%' : '0%',
              transitionDelay: '0ms'
            }}
          ></div>
        </div>
      </div>

      {/* Optimistic */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-neutral-500">Best Case</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-neutral-900">{format(optimistic)}</span>
            <span className={`text-xs font-medium ${getColor(optimisticDelta)}`}>
              {optimisticDelta > 0 ? '+' : ''}{optimisticDelta.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-neutral-200">
          <div 
            className={`h-full rounded-full ${getBarColor(optimisticDelta)} transition-all duration-1000 ${animated ? 'opacity-100' : 'opacity-0'}`}
            style={{ 
              width: animated ? `${Math.min((optimistic / baseline) * 100, 100)}%` : '0%',
              transitionDelay: '200ms'
            }}
          ></div>
        </div>
      </div>

      {/* Pessimistic */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-neutral-500">Worst Case</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-neutral-900">{format(pessimistic)}</span>
            <span className={`text-xs font-medium ${getColor(pessimisticDelta)}`}>
              {pessimisticDelta > 0 ? '+' : ''}{pessimisticDelta.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-neutral-200">
          <div 
            className={`h-full rounded-full ${getBarColor(pessimisticDelta)} transition-all duration-1000 ${animated ? 'opacity-100' : 'opacity-0'}`}
            style={{ 
              width: animated ? `${Math.min((pessimistic / baseline) * 100, 100)}%` : '0%',
              transitionDelay: '400ms'
            }}
          ></div>
        </div>
      </div>

      {/* Range indicator */}
      <div className="pt-2 border-t border-neutral-200">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>Scenario Range:</span>
          <span className="font-medium text-neutral-700">
            {format(pessimistic - optimistic)} ({Math.abs(optimisticDelta - pessimisticDelta).toFixed(0)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
