import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found. Using fallback CSV data.');
}

// Only create client if credentials exist
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

// Database types
export interface DbCountryCrisisMetrics {
  id: number;
  iso3: string;
  country: string;
  population: number;
  in_need: number;
  targeted: number;
  need_rate: number;
  coverage_rate: number;
  funding_gap: number;
  revised_requirements: number;
  usd_per_person_in_need: number;
  mismatch: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface DbClusterMetrics {
  id: number;
  cluster: string;
  description: string;
  total_in_need: number;
  total_targeted: number;
  coverage_rate: number;
  country_count: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface DbDashboardSummary {
  id: number;
  year: number;
  total_countries: number;
  total_in_need: number;
  total_targeted: number;
  total_requirements: number;
  avg_coverage_rate: number;
  avg_usd_per_person: number;
  created_at: string;
  updated_at: string;
}

export interface DbCountryClusterGap {
  id: number;
  iso3: string;
  country: string;
  cluster: string;
  in_need: number;
  targeted: number;
  coverage_rate: number;
  gap: number;
  year: number;
  created_at: string;
  updated_at: string;
}
