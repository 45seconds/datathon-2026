import { NextRequest, NextResponse } from 'next/server';

// Mock predictive data - In production, this would come from your ML model
// This data structure mirrors what your notebook ML model would output

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

// Simulated ML predictions based on your notebook's logic
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

  // Simulate slight delay to mimic real API
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
