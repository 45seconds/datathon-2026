import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

// Country name mapping
const COUNTRY_NAMES: Record<string, string> = {
  'SDN': 'Sudan',
  'AFG': 'Afghanistan',
  'YEM': 'Yemen',
  'ETH': 'Ethiopia',
  'SOM': 'Somalia',
  'SYR': 'Syria',
  'COD': 'Congo (DRC)',
  'SSD': 'South Sudan',
  'NGA': 'Nigeria',
  'MMR': 'Myanmar',
  'PSE': 'Palestine',
  'HTI': 'Haiti'
};

function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: any = {};
    headers.forEach((header, index) => {
      const value = values[index];
      // Try to parse as number, otherwise keep as string
      row[header] = isNaN(Number(value)) ? value : Number(value);
    });
    return row;
  });
}

function loadPredictionsFromCSV(): CountryPrediction[] {
  try {
    const csvPath = path.join(process.cwd(), '..', 'outputs', 'predictions_2027.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);
    
    return rows.map((row: any) => ({
      country: COUNTRY_NAMES[row.iso3] || row.iso3,
      iso3: row.iso3,
      baseline: {
        requirement: row.baseline_requirement,
        gap: row.baseline_gap,
        inNeed: row.baseline_in_need,
        coverage: row.baseline_coverage,
        severity: row.baseline_severity
      },
      optimistic: {
        requirement: row.optimistic_requirement,
        gap: row.optimistic_gap,
        inNeed: row.optimistic_in_need,
        coverage: row.optimistic_coverage,
        severity: row.optimistic_severity
      },
      pessimistic: {
        requirement: row.pessimistic_requirement,
        gap: row.pessimistic_gap,
        inNeed: row.pessimistic_in_need,
        coverage: row.pessimistic_coverage,
        severity: row.pessimistic_severity
      },
      priorityScore: row.priority_score,
      riskScore: row.risk_score,
      scenarioVariance: row.scenario_variance
    })).filter((pred: CountryPrediction) => pred.iso3); // Filter out any empty rows
  } catch (error) {
    console.error('Error loading predictions from CSV:', error);
    // Return empty array if file not found (will trigger fallback)
    return [];
  }
}

// Load predictions from CSV
let PREDICTIONS: CountryPrediction[] = [];

function getPredictions(): CountryPrediction[] {
  if (PREDICTIONS.length === 0) {
    PREDICTIONS = loadPredictionsFromCSV();
  }
  return PREDICTIONS;
}

function calculateSummary(predictions: CountryPrediction[]): PredictionSummary {
  return {
    totalBaselineRequirement: predictions.reduce((sum, p) => sum + p.baseline.requirement, 0),
    totalBaselineGap: predictions.reduce((sum, p) => sum + p.baseline.gap, 0),
    totalOptimisticGap: predictions.reduce((sum, p) => sum + p.optimistic.gap, 0),
    totalPessimisticGap: predictions.reduce((sum, p) => sum + p.pessimistic.gap, 0),
    averageCoverage: predictions.reduce((sum, p) => sum + p.baseline.coverage, 0) / predictions.length,
    totalPeopleAffected: predictions.reduce((sum, p) => sum + p.baseline.inNeed, 0),
    criticalCountries: predictions.filter(p => p.priorityScore > 0.8).length,
    highPriorityCountries: predictions.filter(p => p.priorityScore > 0.6 && p.priorityScore <= 0.8).length,
    modelAccuracy: 0.877, // From notebook model evaluation
    modelR2Score: 0.8567  // From notebook model evaluation
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';

  // Small delay for UX (optional)
  await new Promise(resolve => setTimeout(resolve, 100));

  const predictions = getPredictions();
  
  if (predictions.length === 0) {
    return NextResponse.json({ 
      error: 'No predictions available. Please run: python scripts/generate_2027_predictions.py' 
    }, { status: 500 });
  }

  const summary = calculateSummary(predictions);

  if (type === 'summary') {
    return NextResponse.json(summary);
  }

  if (type === 'countries') {
    return NextResponse.json(predictions);
  }

  return NextResponse.json({
    summary,
    countries: predictions,
    metadata: {
      generated_from: 'outputs/predictions_2027.csv',
      model_source: 'notebooks/DSC_Datathon.ipynb',
      year: 2027
    }
  });
}
