import { promises as fs } from 'fs';
import path from 'path';
import type { INFORMSeverity, CrisisTimeline } from '@/types';

const DATA_DIR = path.join(process.cwd(), '..', 'data', 'geo_mismatch');

interface CSVRow {
  [key: string]: string;
}

async function parseCSV(filePath: string): Promise<CSVRow[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const data: CSVRow[] = [];

  // Skip first two rows (headers + schema row)
  for (let i = 3; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;

    const row: CSVRow = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || '';
    });
    data.push(row);
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
  if (!value || value === '' || value === 'x') return 0;
  const num = parseFloat(value.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

function parseDrivers(driversStr: string): string[] {
  if (!driversStr || driversStr.trim() === '') return [];
  return driversStr.split(',').map((d) => d.trim()).filter(Boolean);
}

export async function getINFORMData(): Promise<INFORMSeverity[]> {
  try {
    const informPath = path.join(DATA_DIR, 'inform_severity_master_2020_2025.csv');
    const rows = await parseCSV(informPath);

    const data: INFORMSeverity[] = [];

    for (const row of rows) {
      const iso3 = row['ISO3'];
      
      // Skip regional crises (multiple ISO codes)
      if (!iso3 || iso3.includes(',')) continue;

      const drivers = parseDrivers(row['DRIVERS']);

      data.push({
        iso3,
        countryName: row['COUNTRY'] || '',
        crisisType: row['TYPE OF CRISIS'] || '',
        severityIndex: parseNumber(row['INFORM Severity Index']),
        severityCategory: row['INFORM Severity category.1'] || '',
        trend: row['Trend (last 3 months)'] || '',
        primaryDriver: drivers[0] || 'Unknown',
        drivers,
        region: row['Regions'] || '',
        complexity: parseNumber(row['Complexity of the crisis']),
        operatingEnv: parseNumber(row['Operating environment']),
        year: parseInt(row['Year'], 10) || 0,
        lastUpdated: row['Last updated'] || '',
      });
    }

    return data;
  } catch (error) {
    console.error('Failed to load INFORM data:', error);
    return [];
  }
}

export async function getINFORMForCountry(
  iso3: string,
  year: number
): Promise<INFORMSeverity | null> {
  const allData = await getINFORMData();
  
  // Try exact year match, then fall back to closest available year
  let match = allData.find((d) => d.iso3 === iso3 && d.year === year);
  
  if (!match) {
    // Use latest available year for this country
    const countryData = allData
      .filter((d) => d.iso3 === iso3)
      .sort((a, b) => b.year - a.year);
    match = countryData[0];
  }

  return match || null;
}

export async function getCrisisTimeline(iso3: string): Promise<CrisisTimeline | null> {
  try {
    const hrpPath = path.join(DATA_DIR, 'humanitarian-response-plans.csv');
    const content = await fs.readFile(hrpPath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    if (lines.length < 2) return null;

    const headers = lines[0].split(',').map((h) => h.trim());
    
    const plans: CrisisTimeline['plans'] = [];
    let firstDate: Date | null = null;

    // Skip schema row (index 1)
    for (let i = 2; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;

      const row: CSVRow = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || '';
      });

      const locations = row['locations'] || '';
      
      // Only single-country plans
      if (locations.includes('|')) continue;
      if (locations.trim() !== iso3) continue;

      const startDate = row['startDate'];
      const endDate = row['endDate'];
      const requirements = parseNumber(row['revisedRequirements']);

      if (startDate) {
        const date = new Date(startDate);
        if (!firstDate || date < firstDate) {
          firstDate = date;
        }
      }

      plans.push({
        code: row['code'] || '',
        startDate: startDate || '',
        endDate: endDate || '',
        requirements,
      });
    }

    if (plans.length === 0) return null;

    const now = new Date('2026-01-01');
    const yearsSince = firstDate
      ? (now.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      : 0;

    return {
      iso3,
      firstResponseDate: firstDate?.toISOString().split('T')[0] || '',
      yearsSinceFirstResponse: Math.round(yearsSince * 10) / 10,
      plans: plans.sort((a, b) => a.startDate.localeCompare(b.startDate)),
    };
  } catch (error) {
    console.error('Failed to load crisis timeline:', error);
    return null;
  }
}

// Get aggregated INFORM data for a specific year
export async function getINFORMAggregated(
  year: number
): Promise<Map<string, INFORMSeverity>> {
  const allData = await getINFORMData();
  
  // Use specified year, or fall back to latest available
  const targetYear = year <= 2025 ? year : 2025;
  
  const result = new Map<string, INFORMSeverity>();
  
  // Group by ISO3 and take highest severity
  const byCountry = new Map<string, INFORMSeverity[]>();
  
  for (const d of allData) {
    if (d.year !== targetYear) continue;
    
    const existing = byCountry.get(d.iso3) || [];
    existing.push(d);
    byCountry.set(d.iso3, existing);
  }
  
  for (const [iso3, entries] of byCountry) {
    // Take the one with highest severity index
    const best = entries.reduce((a, b) => 
      a.severityIndex > b.severityIndex ? a : b
    );
    result.set(iso3, best);
  }
  
  return result;
}
