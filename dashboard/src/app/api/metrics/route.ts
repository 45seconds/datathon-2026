import { NextResponse } from 'next/server';
import {
  getCountryCrisisMetrics,
  getDashboardSummary,
  getYearlyTrends,
  getClusterMetrics,
  getTopForgottenCrises,
} from '@/lib/data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || '2026', 10);
  const type = searchParams.get('type') || 'summary';

  try {
    switch (type) {
      case 'summary':
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
