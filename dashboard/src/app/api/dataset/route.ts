import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Parse a CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

// Allowed dataset paths for security
const ALLOWED_PATHS = [
  'data/geo_mismatch/hpc_hno_2024.csv',
  'data/geo_mismatch/hpc_hno_2025.csv',
  'data/geo_mismatch/hpc_hno_2026.csv',
  'data/geo_mismatch/humanitarian-response-plans.csv',
  'data/geo_mismatch/cod_population_admin0.csv',
  'data/geo_mismatch/inform_severity_master_2020_2025.csv',
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const datasetPath = searchParams.get('path');

  if (!datasetPath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // Security: Validate the path is allowed
  if (!ALLOWED_PATHS.includes(datasetPath)) {
    return NextResponse.json({ error: 'Invalid dataset path' }, { status: 400 });
  }

  try {
    // Convert path: data/geo_mismatch/file.csv -> geo_mismatch/file.csv
    const storagePath = datasetPath.replace('data/', '');
    
    // Fetch from Supabase Storage
    const { data, error } = await supabase.storage
      .from('datasets')
      .download(storagePath);

    if (error || !data) {
      console.error('Supabase Storage error:', error);
      return NextResponse.json({ error: 'Failed to load dataset from storage' }, { status: 500 });
    }

    // Parse CSV content
    const content = await data.text();
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return NextResponse.json({ headers: [], rows: [], totalRows: 0 });
    }

    const headers = parseCSVLine(lines[0]);
    
    // Skip schema row if present (HDX CSVs have a second row starting with #)
    let startRow = 1;
    if (lines.length > 1 && lines[1].startsWith('#')) {
      startRow = 2;
    }

    const rows: string[][] = [];
    const maxRows = 500; // Limit rows for performance
    
    for (let i = startRow; i < Math.min(lines.length, startRow + maxRows); i++) {
      const row = parseCSVLine(lines[i]);
      if (row.length === headers.length) {
        rows.push(row);
      }
    }

    return NextResponse.json({
      headers,
      rows,
      totalRows: lines.length - startRow,
    });
  } catch (error) {
    console.error('Failed to load dataset:', error);
    return NextResponse.json({ error: 'Failed to load dataset' }, { status: 500 });
  }
}
