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
