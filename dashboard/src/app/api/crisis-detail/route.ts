import { NextResponse } from 'next/server';
import * as supabaseData from '@/lib/data-supabase';
import * as csvData from '@/lib/data';
import * as supabaseInform from '@/lib/inform-supabase';
import * as csvInform from '@/lib/inform';
import { supabase } from '@/lib/supabase';
import type { CrisisDetail, CountryClusterGap } from '@/types';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
};

// Use Supabase if configured, otherwise fallback to CSV
const dataSource = isSupabaseConfigured() ? supabaseData : csvData;
const informSource = isSupabaseConfigured() ? supabaseInform : csvInform;

// Get sector gaps for a specific country
async function getCountrySectorGaps(
  iso3: string,
  year: number
): Promise<CountryClusterGap[]> {
  try {
    if (isSupabaseConfigured()) {
      // Use Supabase
      const { data, error } = await supabase
        .from('country_cluster_gaps')
        .select('*')
        .eq('iso3', iso3)
        .eq('year', year)
        .order('coverage_rate', { ascending: true });

      if (error || !data) return [];

      return data.map((row) => ({
        cluster: row.cluster,
        inNeed: Number(row.in_need),
        targeted: Number(row.targeted),
        coverageRate: Number(row.coverage_rate),
        gap: Number(row.gap),
      }));
    } else {
      // Fallback to CSV (for local development)
      return [];
    }
  } catch {
    return [];
  }
}

// Region mapping
const REGION_MAP: Record<string, string> = {
  AFG: 'Asia',
  BFA: 'Africa',
  CAF: 'Africa',
  CMR: 'Africa',
  COD: 'Africa',
  COL: 'Americas',
  ETH: 'Africa',
  HTI: 'Americas',
  IRQ: 'Middle East',
  KEN: 'Africa',
  LBY: 'Africa',
  MLI: 'Africa',
  MMR: 'Asia',
  MOZ: 'Africa',
  NER: 'Africa',
  NGA: 'Africa',
  PAK: 'Asia',
  PSE: 'Middle East',
  SDN: 'Africa',
  SOM: 'Africa',
  SSD: 'Africa',
  SYR: 'Middle East',
  TCD: 'Africa',
  UKR: 'Europe',
  VEN: 'Americas',
  YEM: 'Middle East',
  ZWE: 'Africa',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const iso3 = searchParams.get('iso3');
  const year = parseInt(searchParams.get('year') || '2026', 10);

  if (!iso3) {
    return NextResponse.json({ error: 'Missing iso3 parameter' }, { status: 400 });
  }

  try {
    // Get current metrics
    const allMetrics = await dataSource.getCountryCrisisMetrics(year);
    const currentMetrics = allMetrics.find((m) => m.iso3 === iso3);

    if (!currentMetrics) {
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    // Get INFORM severity data
    const severity = await informSource.getINFORMForCountry(iso3, year);

    // Get sector gaps
    const sectorGaps = await getCountrySectorGaps(iso3, year);

    // Get timeline
    const timeline = await informSource.getCrisisTimeline(iso3);

    // Get historical trends (2024-2026)
    const trends: CrisisDetail['trends'] = [];
    for (const y of [2024, 2025, 2026]) {
      try {
        const yearMetrics = await dataSource.getCountryCrisisMetrics(y);
        const countryMetric = yearMetrics.find((m) => m.iso3 === iso3);
        if (countryMetric) {
          trends.push({
            year: y,
            inNeed: countryMetric.inNeed,
            mismatch: countryMetric.mismatch,
            usdPerPerson: countryMetric.usdPerPersonInNeed,
          });
        }
      } catch {
        // Year data may not exist
      }
    }

    // Build sources
    const sources: CrisisDetail['sources'] = [
      {
        name: 'HPC HNO',
        description: `Humanitarian Needs Overview ${year}`,
        url: 'https://data.humdata.org/',
      },
      {
        name: 'HRP',
        description: 'Humanitarian Response Plans',
        url: 'https://fts.unocha.org/',
      },
    ];

    if (severity) {
      sources.push({
        name: 'INFORM Severity Index',
        description: `Crisis severity data (${severity.year})`,
        url: 'https://drmkc.jrc.ec.europa.eu/inform-index',
      });
    }

    const detail: CrisisDetail = {
      iso3,
      country: currentMetrics.country,
      region: severity?.region || REGION_MAP[iso3] || 'Unknown',
      currentMetrics,
      severity,
      sectorGaps,
      timeline,
      trends,
      sources,
    };

    return NextResponse.json(detail);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crisis detail' },
      { status: 500 }
    );
  }
}
