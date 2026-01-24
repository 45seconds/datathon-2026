import { supabase } from './supabase';
import type { INFORMSeverity, CrisisTimeline } from '@/types';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
};

export async function getINFORMData(): Promise<INFORMSeverity[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('inform_severity')
    .select('*')
    .order('year', { ascending: false });

  if (error) {
    console.error('Failed to load INFORM data:', error);
    return [];
  }

  return (data || []).map((row) => ({
    iso3: row.iso3,
    countryName: row.country_name,
    crisisType: row.crisis_type || '',
    severityIndex: Number(row.severity_index) || 0,
    severityCategory: row.severity_category || '',
    trend: row.trend || '',
    primaryDriver: row.primary_driver || '',
    drivers: row.drivers || [],
    region: row.region || '',
    complexity: Number(row.complexity) || 0,
    operatingEnv: Number(row.operating_env) || 0,
    year: row.year,
    lastUpdated: row.last_updated || '',
  }));
}

export async function getINFORMForCountry(
  iso3: string,
  year: number = 2025
): Promise<INFORMSeverity | null> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  // Try exact year first
  let { data, error } = await supabase
    .from('inform_severity')
    .select('*')
    .eq('iso3', iso3)
    .eq('year', year)
    .single();

  // If not found, try most recent year for this country
  if (error || !data) {
    const result = await supabase
      .from('inform_severity')
      .select('*')
      .eq('iso3', iso3)
      .order('year', { ascending: false })
      .limit(1)
      .single();

    data = result.data;
    error = result.error;
  }

  if (error || !data) {
    return null;
  }

  return {
    iso3: data.iso3,
    countryName: data.country_name,
    crisisType: data.crisis_type || '',
    severityIndex: Number(data.severity_index) || 0,
    severityCategory: data.severity_category || '',
    trend: data.trend || '',
    primaryDriver: data.primary_driver || '',
    drivers: data.drivers || [],
    region: data.region || '',
    complexity: Number(data.complexity) || 0,
    operatingEnv: Number(data.operating_env) || 0,
    year: data.year,
    lastUpdated: data.last_updated || '',
  };
}

export async function getCrisisTimeline(
  iso3: string
): Promise<CrisisTimeline | null> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('humanitarian_plans')
    .select('*')
    .contains('locations', [iso3])
    .order('start_date', { ascending: true });

  if (error || !data || data.length === 0) {
    return null;
  }

  const plans = data.map((row) => ({
    code: row.code,
    startDate: row.start_date,
    endDate: row.end_date,
    requirements: Number(row.revised_requirements) || 0,
  }));

  const firstPlan = plans[0];
  if (!firstPlan || !firstPlan.startDate) {
    return null;
  }

  const firstDate = new Date(firstPlan.startDate);
  const now = new Date();
  const yearsSince = Math.floor(
    (now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );

  return {
    iso3,
    firstResponseDate: firstPlan.startDate,
    yearsSinceFirstResponse: yearsSince,
    plans,
  };
}

export async function getINFORMAggregated(
  year: number = 2025
): Promise<Map<string, INFORMSeverity>> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('inform_severity')
    .select('*')
    .lte('year', year)
    .order('year', { ascending: false });

  if (error || !data) {
    return new Map();
  }

  // Group by country, keep most recent
  const byCountry = new Map<string, INFORMSeverity>();
  
  for (const row of data) {
    if (!byCountry.has(row.iso3)) {
      byCountry.set(row.iso3, {
        iso3: row.iso3,
        countryName: row.country_name,
        crisisType: row.crisis_type || '',
        severityIndex: Number(row.severity_index) || 0,
        severityCategory: row.severity_category || '',
        trend: row.trend || '',
        primaryDriver: row.primary_driver || '',
        drivers: row.drivers || [],
        region: row.region || '',
        complexity: Number(row.complexity) || 0,
        operatingEnv: Number(row.operating_env) || 0,
        year: row.year,
        lastUpdated: row.last_updated || '',
      });
    }
  }

  return byCountry;
}
