'use client';

import { useEffect, useState } from 'react';

interface CountryData {
  country: string;
  iso3: string;
  value: number;
  color: string;
}

interface CountryRaceChartProps {
  data: CountryData[];
  title: string;
  valueLabel: string;
  formatValue: (n: number) => string;
}

export function CountryRaceChart({ data, title, valueLabel, formatValue }: CountryRaceChartProps) {
  const [animated, setAnimated] = useState(false);
  const [sortedData, setSortedData] = useState(data);

  useEffect(() => {
    // Animate sorting
    const timer1 = setTimeout(() => {
      setSortedData([...data].sort((a, b) => b.value - a.value));
    }, 300);

    const timer2 = setTimeout(() => {
      setAnimated(true);
    }, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [data]);

  const maxValue = Math.max(...sortedData.map(d => d.value));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-neutral-900">{title}</h3>
        <span className="text-xs text-neutral-500">{valueLabel}</span>
      </div>

      <div className="space-y-2">
        {sortedData.map((item, index) => {
          const widthPercent = (item.value / maxValue) * 100;
          const delay = index * 50;

          return (
            <div 
              key={item.iso3}
              className="flex items-center gap-3 transition-all duration-700 ease-out"
              style={{
                transform: animated ? 'translateY(0)' : 'translateY(20px)',
                opacity: animated ? 1 : 0,
                transitionDelay: `${delay}ms`
              }}
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700 shrink-0">
                {index + 1}
              </div>

              {/* Country name */}
              <div className="w-32 shrink-0">
                <span className="text-sm font-medium text-neutral-900">{item.country}</span>
              </div>

              {/* Animated bar */}
              <div className="flex-1 relative">
                <div className="h-10 w-full rounded-lg bg-neutral-100 overflow-hidden">
                  <div 
                    className={`h-full ${item.color} transition-all duration-1000 ease-out relative overflow-hidden`}
                    style={{
                      width: animated ? `${widthPercent}%` : '0%',
                      transitionDelay: `${delay + 200}ms`
                    }}
                  >
                    {/* Shine effect */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shine"
                      style={{
                        animationDelay: `${delay + 1000}ms`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Value label */}
                {animated && (
                  <div 
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-900 transition-opacity duration-300"
                    style={{
                      opacity: widthPercent > 40 ? 1 : 0,
                      transitionDelay: `${delay + 800}ms`
                    }}
                  >
                    {formatValue(item.value)}
                  </div>
                )}
              </div>

              {/* Value outside bar (for small bars) */}
              {animated && widthPercent <= 40 && (
                <div 
                  className="w-24 text-right text-sm font-semibold text-neutral-900 shrink-0 transition-opacity duration-300"
                  style={{
                    transitionDelay: `${delay + 800}ms`
                  }}
                >
                  {formatValue(item.value)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes shine {
          0% {
            transform: translateX(-100%) skewX(-15deg);
          }
          100% {
            transform: translateX(200%) skewX(-15deg);
          }
        }
        .animate-shine {
          animation: shine 2s ease-in-out;
        }
      `}</style>
    </div>
  );
}
