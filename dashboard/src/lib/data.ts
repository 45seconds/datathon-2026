import { promises as fs } from 'fs';
import path from 'path';
import {
  CountryCrisisMetrics,
  DashboardSummary,
  YearlyTrend,
  ClusterMetrics,
} from '@/types';

const DATA_DIR = path.join(process.cwd(), '..', 'data', 'geo_mismatch');

interface CSVParseOptions {
  skipRows?: number[];
}

async function parseCSV<T>(
  filePath: string,
  options: CSVParseOptions = {}
): Promise<T[]> {
  const { skipRows = [1] } = options; // Skip schema row by default
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const data: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (skipRows.includes(i)) continue;

    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || '';
    });
    data.push(row as T);
  }

  return data;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function parseNumber(value: string | undefined): number {
  if (!value || value === '') return 0;
  const num = parseFloat(value.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

// Country name mapping for ISO3 codes
const COUNTRY_NAMES: Record<string, string> = {
  AFG: 'Afghanistan',
  BFA: 'Burkina Faso',
  CAF: 'Central African Republic',
  CMR: 'Cameroon',
  COD: 'DR Congo',
  COL: 'Colombia',
  ETH: 'Ethiopia',
  HTI: 'Haiti',
  IRQ: 'Iraq',
  KEN: 'Kenya',
  LBY: 'Libya',
  MLI: 'Mali',
  MMR: 'Myanmar',
  MOZ: 'Mozambique',
  NER: 'Niger',
  NGA: 'Nigeria',
  PAK: 'Pakistan',
  PSE: 'Palestine',
  SDN: 'Sudan',
  SOM: 'Somalia',
  SSD: 'South Sudan',
  SYR: 'Syria',
  TCD: 'Chad',
  UKR: 'Ukraine',
  VEN: 'Venezuela',
  YEM: 'Yemen',
  ZWE: 'Zimbabwe',
};

export async function getCountryCrisisMetrics(
  year: number = 2026
): Promise<CountryCrisisMetrics[]> {
  // Load HNO data
  const hnoPath = path.join(DATA_DIR, `hpc_hno_${year}.csv`);
  const hnoData = await parseCSV<Record<string, string>>(hnoPath);

  // Load HRP data
  const hrpPath = path.join(DATA_DIR, 'humanitarian-response-plans.csv');
  const hrpData = await parseCSV<Record<string, string>>(hrpPath);

  // Load population data
  const popPath = path.join(DATA_DIR, 'cod_population_admin0.csv');
  const popData = await parseCSV<Record<string, string>>(popPath);

  // Build population map (total population by ISO3)
  const populationMap: Record<string, number> = {};
  popData.forEach((row) => {
    if (
      row['Population_group'] === 'T_TL' &&
      row['Gender'] === 'all' &&
      row['Age_range'] === 'all'
    ) {
      const iso3 = row['ISO3'];
      const pop = parseNumber(row['Population']);
      if (iso3 && pop > 0) {
        populationMap[iso3] = pop;
      }
    }
  });

  // Build requirements map from HRP (single-country plans only)
  const requirementsMap: Record<string, number> = {};
  hrpData.forEach((row) => {
    const locations = row['locations'] || '';
    const years = row['years'] || '';
    const requirements = parseNumber(row['revisedRequirements']);

    // Only include if it's a single country and matches the year
    if (!locations.includes('|') && years.includes(year.toString())) {
      const iso3 = locations.trim();
      if (iso3 && requirements > 0) {
        requirementsMap[iso3] = (requirementsMap[iso3] || 0) + requirements;
      }
    }
  });

  // Aggregate HNO data by country (using overall/total category)
  const countryNeedsMap: Record<
    string,
    { inNeed: number; targeted: number; population: number }
  > = {};

  hnoData.forEach((row) => {
    const iso3 = row['Country ISO3'];
    const cluster = row['Cluster'] || '';
    const category = row['Category'] || '';

    // Only use overall totals (cluster = ALL and no sub-category breakdown)
    if (cluster === 'ALL' && !category.includes('-')) {
      const inNeed = parseNumber(row['In Need']);
      const targeted = parseNumber(row['Targeted']);
      const population = parseNumber(row['Population']);

      if (iso3 && inNeed > 0) {
        if (!countryNeedsMap[iso3]) {
          countryNeedsMap[iso3] = { inNeed: 0, targeted: 0, population: 0 };
        }
        // Take the max (to avoid double counting from different aggregation levels)
        countryNeedsMap[iso3].inNeed = Math.max(
          countryNeedsMap[iso3].inNeed,
          inNeed
        );
        countryNeedsMap[iso3].targeted = Math.max(
          countryNeedsMap[iso3].targeted,
          targeted
        );
        countryNeedsMap[iso3].population = Math.max(
          countryNeedsMap[iso3].population,
          population
        );
      }
    }
  });

  // Build final metrics
  const metrics: CountryCrisisMetrics[] = [];

  for (const [iso3, needs] of Object.entries(countryNeedsMap)) {
    const population =
      needs.population || populationMap[iso3] || needs.inNeed * 2;
    const requirements = requirementsMap[iso3] || 0;

    const needRate = population > 0 ? needs.inNeed / population : 0;
    const coverageRate = needs.inNeed > 0 ? needs.targeted / needs.inNeed : 0;
    const fundingGap = needs.inNeed - needs.targeted;
    const usdPerPerson = needs.inNeed > 0 ? requirements / needs.inNeed : 0;

    metrics.push({
      iso3,
      country: COUNTRY_NAMES[iso3] || iso3,
      population,
      inNeed: needs.inNeed,
      targeted: needs.targeted,
      needRate,
      coverageRate,
      fundingGap,
      revisedRequirements: requirements,
      usdPerPersonInNeed: usdPerPerson,
      mismatch: 0, // Will be calculated after all metrics are built
      year,
    });
  }

  // Calculate mismatch scores (percentile-based)
  const needRates = metrics.map((m) => m.needRate).sort((a, b) => a - b);
  const usdRates = metrics
    .filter((m) => m.usdPerPersonInNeed > 0)
    .map((m) => m.usdPerPersonInNeed)
    .sort((a, b) => a - b);

  const getPercentile = (value: number, sorted: number[]): number => {
    if (sorted.length === 0) return 0.5;
    const idx = sorted.findIndex((v) => v >= value);
    return idx === -1 ? 1 : idx / sorted.length;
  };

  metrics.forEach((m) => {
    const needPct = getPercentile(m.needRate, needRates);
    const usdPct = m.usdPerPersonInNeed > 0 ? getPercentile(m.usdPerPersonInNeed, usdRates) : 0.5;
    m.mismatch = needPct - usdPct;
  });

  // Sort by inNeed descending
  return metrics.sort((a, b) => b.inNeed - a.inNeed);
}

export async function getDashboardSummary(
  year: number = 2026
): Promise<DashboardSummary> {
  const metrics = await getCountryCrisisMetrics(year);

  const totalInNeed = metrics.reduce((sum, m) => sum + m.inNeed, 0);
  const totalTargeted = metrics.reduce((sum, m) => sum + m.targeted, 0);
  const totalRequirements = metrics.reduce(
    (sum, m) => sum + m.revisedRequirements,
    0
  );
  const avgCoverageRate = totalInNeed > 0 ? totalTargeted / totalInNeed : 0;

  const countriesWithRequirements = metrics.filter(
    (m) => m.revisedRequirements > 0
  );
  const avgUsdPerPerson =
    countriesWithRequirements.length > 0
      ? countriesWithRequirements.reduce((sum, m) => sum + m.usdPerPersonInNeed, 0) /
        countriesWithRequirements.length
      : 0;

  return {
    totalCountries: metrics.length,
    totalInNeed,
    totalTargeted,
    totalRequirements,
    avgCoverageRate,
    avgUsdPerPerson,
  };
}

export async function getYearlyTrends(): Promise<YearlyTrend[]> {
  const years = [2024, 2025, 2026];
  const trends: YearlyTrend[] = [];

  for (const year of years) {
    try {
      const summary = await getDashboardSummary(year);
      trends.push({
        year,
        totalInNeed: summary.totalInNeed,
        totalTargeted: summary.totalTargeted,
        totalRequirements: summary.totalRequirements,
        coverageRate: summary.avgCoverageRate,
      });
    } catch {
      // Year data may not exist
      continue;
    }
  }

  return trends;
}

export async function getClusterMetrics(
  year: number = 2026
): Promise<ClusterMetrics[]> {
  const hnoPath = path.join(DATA_DIR, `hpc_hno_${year}.csv`);
  const hnoData = await parseCSV<Record<string, string>>(hnoPath);

  const clusterMap: Record<
    string,
    {
      description: string;
      countries: Set<string>;
      inNeed: number;
      targeted: number;
    }
  > = {};

  hnoData.forEach((row) => {
    const cluster = row['Cluster'] || '';
    const description = row['Description'] || '';
    const iso3 = row['Country ISO3'] || '';

    // Skip overall aggregates
    if (cluster === 'ALL' || !cluster) return;

    const inNeed = parseNumber(row['In Need']);
    const targeted = parseNumber(row['Targeted']);

    if (!clusterMap[cluster]) {
      clusterMap[cluster] = {
        description: description || cluster,
        countries: new Set(),
        inNeed: 0,
        targeted: 0,
      };
    }

    clusterMap[cluster].countries.add(iso3);
    clusterMap[cluster].inNeed += inNeed;
    clusterMap[cluster].targeted += targeted;
  });

  const metrics: ClusterMetrics[] = Object.entries(clusterMap).map(
    ([cluster, data]) => ({
      cluster,
      description: data.description,
      totalInNeed: data.inNeed,
      totalTargeted: data.targeted,
      coverageRate: data.inNeed > 0 ? data.targeted / data.inNeed : 0,
      countryCount: data.countries.size,
    })
  );

  return metrics.sort((a, b) => b.totalInNeed - a.totalInNeed).slice(0, 10);
}

export async function getTopForgottenCrises(
  year: number = 2026,
  limit: number = 10
): Promise<CountryCrisisMetrics[]> {
  const metrics = await getCountryCrisisMetrics(year);

  // "Forgotten" = high need rate but low USD per person
  // Calculate mismatch score: percentile(needRate) - percentile(usdPerPerson)
  const needRates = metrics.map((m) => m.needRate).sort((a, b) => a - b);
  const usdRates = metrics
    .filter((m) => m.usdPerPersonInNeed > 0)
    .map((m) => m.usdPerPersonInNeed)
    .sort((a, b) => a - b);

  const getPercentile = (value: number, sorted: number[]): number => {
    const idx = sorted.findIndex((v) => v >= value);
    return idx === -1 ? 1 : idx / sorted.length;
  };

  const scored = metrics.map((m) => ({
    ...m,
    mismatchScore:
      getPercentile(m.needRate, needRates) -
      (m.usdPerPersonInNeed > 0
        ? getPercentile(m.usdPerPersonInNeed, usdRates)
        : 0.5),
  }));

  return scored
    .sort((a, b) => b.mismatchScore - a.mismatchScore)
    .slice(0, limit);
}
