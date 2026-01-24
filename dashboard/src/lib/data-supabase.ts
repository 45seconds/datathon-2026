import {
  supabase,
  DbCountryCrisisMetrics,
  DbClusterMetrics,
  DbDashboardSummary,
} from './supabase';
import {
  CountryCrisisMetrics,
  DashboardSummary,
  YearlyTrend,
  ClusterMetrics,
} from '@/types';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
};

// Transform database record to app type
function transformCountryMetrics(
  db: DbCountryCrisisMetrics
): CountryCrisisMetrics {
  return {
    iso3: db.iso3,
    country: db.country,
    population: Number(db.population),
    inNeed: Number(db.in_need),
    targeted: Number(db.targeted),
    needRate: Number(db.need_rate),
    coverageRate: Number(db.coverage_rate),
    fundingGap: Number(db.funding_gap),
    revisedRequirements: Number(db.revised_requirements),
    usdPerPersonInNeed: Number(db.usd_per_person_in_need),
    mismatch: Number(db.mismatch),
    year: db.year,
  };
}

function transformClusterMetrics(db: DbClusterMetrics): ClusterMetrics {
  return {
    cluster: db.cluster,
    description: db.description,
    totalInNeed: Number(db.total_in_need),
    totalTargeted: Number(db.total_targeted),
    coverageRate: Number(db.coverage_rate),
    countryCount: db.country_count,
  };
}

function transformDashboardSummary(db: DbDashboardSummary): DashboardSummary {
  return {
    totalCountries: db.total_countries,
    totalInNeed: Number(db.total_in_need),
    totalTargeted: Number(db.total_targeted),
    totalRequirements: Number(db.total_requirements),
    avgCoverageRate: Number(db.avg_coverage_rate),
    avgUsdPerPerson: Number(db.avg_usd_per_person),
  };
}

export async function getCountryCrisisMetrics(
  year: number = 2026
): Promise<CountryCrisisMetrics[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('country_crisis_metrics')
    .select('*')
    .eq('year', year)
    .order('in_need', { ascending: false });

  if (error) {
    console.error('Error fetching country metrics:', error);
    throw error;
  }

  return (data || []).map(transformCountryMetrics);
}

export async function getDashboardSummary(
  year: number = 2026
): Promise<DashboardSummary> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('dashboard_summary')
    .select('*')
    .eq('year', year)
    .single();

  if (error) {
    console.error('Error fetching dashboard summary:', error);
    throw error;
  }

  return transformDashboardSummary(data);
}

export async function getYearlyTrends(): Promise<YearlyTrend[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('dashboard_summary')
    .select('*')
    .order('year', { ascending: true });

  if (error) {
    console.error('Error fetching yearly trends:', error);
    throw error;
  }

  return (data || []).map((db) => ({
    year: db.year,
    totalInNeed: Number(db.total_in_need),
    totalTargeted: Number(db.total_targeted),
    totalRequirements: Number(db.total_requirements),
    coverageRate: Number(db.avg_coverage_rate),
  }));
}

export async function getClusterMetrics(
  year: number = 2026
): Promise<ClusterMetrics[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('cluster_metrics')
    .select('*')
    .eq('year', year)
    .order('total_in_need', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching cluster metrics:', error);
    throw error;
  }

  return (data || []).map(transformClusterMetrics);
}

export async function getTopForgottenCrises(
  year: number = 2026,
  limit: number = 10
): Promise<CountryCrisisMetrics[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('country_crisis_metrics')
    .select('*')
    .eq('year', year)
    .order('mismatch', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching forgotten crises:', error);
    throw error;
  }

  return (data || []).map(transformCountryMetrics);
}
