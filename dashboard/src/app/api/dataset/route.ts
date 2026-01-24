import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const datasetPath = searchParams.get('path');

  if (!datasetPath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // In production, CSV files are not available on the filesystem
  // All data is served from Supabase database via /api/metrics endpoints
  return NextResponse.json({ 
    error: 'Dataset viewer not available in production. All data is served from the database via API endpoints.',
    message: 'Use the dashboard tabs to view crisis data, metrics, and analysis.'
  }, { status: 503 });

  /* Original filesystem code - disabled for production
  try {
    const fullPath = path.join(process.cwd(), '..', datasetPath);
    const { promises as fs } = await import('fs');
    const content = await fs.readFile(fullPath, 'utf-8');
    
    // Parse CSV
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
  */
}
