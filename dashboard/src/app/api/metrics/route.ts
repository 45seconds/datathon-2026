import { NextResponse } from 'next/server';
<<<<<<< HEAD
import {
  getCountryCrisisMetrics,
  getDashboardSummary,
  getYearlyTrends,
  getClusterMetrics,
  getTopForgottenCrises,
} from '@/lib/data';
=======
import * as supabaseData from '@/lib/data-supabase';
import * as csvData from '@/lib/data';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
};

// Use Supabase if configured, otherwise fallback to CSV
const dataSource = isSupabaseConfigured() ? supabaseData : csvData;
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || '2026', 10);
  const type = searchParams.get('type') || 'summary';

  try {
    switch (type) {
      case 'summary':
<<<<<<< HEAD
        const summary = await getDashboardSummary(year);
        return NextResponse.json(summary);

      case 'countries':
        const countries = await getCountryCrisisMetrics(year);
        return NextResponse.json(countries);

      case 'trends':
        const trends = await getYearlyTrends();
        return NextResponse.json(trends);

      case 'clusters':
        const clusters = await getClusterMetrics(year);
        return NextResponse.json(clusters);

      case 'forgotten':
        const forgotten = await getTopForgottenCrises(year);
=======
        const summary = await dataSource.getDashboardSummary(year);
        return NextResponse.json(summary);

      case 'countries':
        const countries = await dataSource.getCountryCrisisMetrics(year);
        return NextResponse.json(countries);

      case 'trends':
        const trends = await dataSource.getYearlyTrends();
        return NextResponse.json(trends);

      case 'clusters':
        const clusters = await dataSource.getClusterMetrics(year);
        return NextResponse.json(clusters);

      case 'forgotten':
        const forgotten = await dataSource.getTopForgottenCrises(year);
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
        return NextResponse.json(forgotten);

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
