'use client';

import { useEffect, useState } from 'react';

interface FunnelTier {
  label: string;
  value: number;
  color: string;
  count: number;
}

interface PriorityFunnelProps {
  tiers: FunnelTier[];
}

export function PriorityFunnel({ tiers }: PriorityFunnelProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, [tiers]);

  const maxValue = Math.max(...tiers.map(t => t.value));

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-neutral-900">Resource Allocation Priorities</h3>
        <p className="text-sm text-neutral-500 mt-1">Funding flow by priority tier</p>
      </div>

      <div className="space-y-3">
        {tiers.map((tier, index) => {
          const widthPercent = (tier.value / maxValue) * 100;
          const delay = index * 150;

          return (
            <div key={tier.label} className="relative">
              {/* Tier label and stats */}
              <div className="flex items-center justify-between mb-2 px-2">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${tier.color}`}></div>
                  <span className="text-sm font-medium text-neutral-900">{tier.label}</span>
                  <span className="text-xs text-neutral-500">({tier.count} countries)</span>
                </div>
                <span className="text-sm font-semibold text-neutral-900">
                  ${(tier.value / 1e9).toFixed(2)}B
                </span>
              </div>

              {/* Animated funnel bar */}
              <div className="relative h-14 flex items-center">
                <div 
                  className="relative h-full rounded-lg shadow-sm transition-all duration-1000 ease-out overflow-hidden"
                  style={{
                    width: animated ? `${widthPercent}%` : '0%',
                    transitionDelay: `${delay}ms`,
                    background: tier.color === 'bg-red-500' 
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.25) 100%)'
                      : tier.color === 'bg-orange-500'
                      ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(234, 88, 12, 0.25) 100%)'
                      : tier.color === 'bg-yellow-500'
                      ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(202, 138, 4, 0.25) 100%)'
                      : 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.25) 100%)',
                    borderLeft: tier.color === 'bg-red-500'
                      ? '3px solid rgba(239, 68, 68, 0.6)'
                      : tier.color === 'bg-orange-500'
                      ? '3px solid rgba(249, 115, 22, 0.6)'
                      : tier.color === 'bg-yellow-500'
                      ? '3px solid rgba(234, 179, 8, 0.6)'
                      : '3px solid rgba(34, 197, 94, 0.6)'
                  }}
                >
                  {/* Subtle shimmer effect */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div 
                      className="h-full w-full opacity-40 animate-flow"
                      style={{
                        background: tier.color === 'bg-red-500'
                          ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)'
                          : tier.color === 'bg-orange-500'
                          ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)'
                          : tier.color === 'bg-yellow-500'
                          ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)'
                          : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                        animationDelay: `${delay + 500}ms`,
                        animationDuration: '3s'
                      }}
                    ></div>
                  </div>

                  {/* Percentage label */}
                  {animated && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-semibold text-neutral-700">
                        {((tier.value / tiers.reduce((sum, t) => sum + t.value, 0)) * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}

                  {/* Subtle top gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                </div>
              </div>

              {/* Connection arrow */}
              {index < tiers.length - 1 && (
                <div className="flex justify-center py-1">
                  <svg 
                    className={`h-4 w-4 text-neutral-400 transition-opacity duration-500`}
                    style={{ 
                      opacity: animated ? 1 : 0,
                      transitionDelay: `${delay + 800}ms`
                    }}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="pt-4 border-t-2 border-neutral-300">
        <div className="flex items-center justify-between px-2">
          <span className="text-sm font-semibold text-neutral-900">Total Allocation</span>
          <span className="text-lg font-bold text-neutral-900">
            ${(tiers.reduce((sum, t) => sum + t.value, 0) / 1e9).toFixed(2)}B
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes flow {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(300%);
          }
        }
        .animate-flow {
          animation: flow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
