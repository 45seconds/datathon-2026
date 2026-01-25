-- SQL migration to create new tables for Challenge 1 outputs and aggregated analysis data
-- Run this in Supabase SQL Editor before running populate_all_data.py

-- Challenge 1: Outlier Projects
CREATE TABLE IF NOT EXISTS public.challenge1_outlier_projects (
    id BIGSERIAL PRIMARY KEY,
    cluster_primary TEXT NOT NULL,
    pooled_fund_name TEXT,
    allocation_year INTEGER,
    organization_name TEXT,
    project_title TEXT,
    budget_usd DOUBLE PRECISION,
    beneficiaries_total DOUBLE PRECISION,
    cpb_usd_per_beneficiary DOUBLE PRECISION,
    cpb_percentile_in_cluster DOUBLE PRECISION,
    z_log10_cpb DOUBLE PRECISION,
    flag_iqr_high BOOLEAN DEFAULT FALSE,
    flag_z_high BOOLEAN DEFAULT FALSE,
    flag_pct_high BOOLEAN DEFAULT FALSE,
    flag_small_denominator BOOLEAN DEFAULT FALSE,
    flag_beneficiaries_gt_country_pop BOOLEAN DEFAULT FALSE,
    outlier_reason TEXT,
    cluster_evidence TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenge 1: Cluster Efficiency Framework
CREATE TABLE IF NOT EXISTS public.challenge1_cluster_efficiency (
    id BIGSERIAL PRIMARY KEY,
    rank INTEGER,
    cluster_primary TEXT NOT NULL,
    n_projects INTEGER,
    median_cpb_usd DOUBLE PRECISION,
    p10_cpb_usd DOUBLE PRECISION,
    p90_cpb_usd DOUBLE PRECISION,
    outlier_rate DOUBLE PRECISION,
    efficiency_score DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aggregated Country-Year Analysis (comprehensive table)
CREATE TABLE IF NOT EXISTS public.country_year_analysis (
    id BIGSERIAL PRIMARY KEY,
    iso3 TEXT NOT NULL,
    country TEXT,
    year INTEGER NOT NULL,
    population BIGINT,
    in_need BIGINT,
    targeted BIGINT,
    need_rate DOUBLE PRECISION,
    coverage_rate DOUBLE PRECISION,
    usd_per_in_need DOUBLE PRECISION,
    req_sum DOUBLE PRECISION,
    mismatch DOUBLE PRECISION,
    mismatch_severity DOUBLE PRECISION,
    severity_index DOUBLE PRECISION,
    crisis_type TEXT,
    primary_driver TEXT,
    region TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(iso3, year)
);

-- HRP-INFORM Aggregated
CREATE TABLE IF NOT EXISTS public.hrp_inform_aggregated (
    id BIGSERIAL PRIMARY KEY,
    iso3 TEXT NOT NULL,
    country TEXT,
    year INTEGER NOT NULL,
    revised_requirements DOUBLE PRECISION,
    severity_index DOUBLE PRECISION,
    crisis_type TEXT,
    primary_driver TEXT,
    region TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(iso3, year)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_challenge1_outliers_cluster ON public.challenge1_outlier_projects(cluster_primary);
CREATE INDEX IF NOT EXISTS idx_challenge1_outliers_year ON public.challenge1_outlier_projects(allocation_year);
CREATE INDEX IF NOT EXISTS idx_challenge1_efficiency_cluster ON public.challenge1_cluster_efficiency(cluster_primary);
CREATE INDEX IF NOT EXISTS idx_country_year_iso3 ON public.country_year_analysis(iso3);
CREATE INDEX IF NOT EXISTS idx_country_year_year ON public.country_year_analysis(year);
CREATE INDEX IF NOT EXISTS idx_country_year_mismatch ON public.country_year_analysis(mismatch_severity DESC);
CREATE INDEX IF NOT EXISTS idx_hrp_inform_iso3 ON public.hrp_inform_aggregated(iso3);
CREATE INDEX IF NOT EXISTS idx_hrp_inform_year ON public.hrp_inform_aggregated(year);

-- Enable Row Level Security (RLS)
ALTER TABLE public.challenge1_outlier_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge1_cluster_efficiency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_year_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hrp_inform_aggregated ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access
CREATE POLICY "Allow public read access" ON public.challenge1_outlier_projects FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.challenge1_cluster_efficiency FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.country_year_analysis FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.hrp_inform_aggregated FOR SELECT USING (true);

-- Grant permissions
GRANT SELECT ON public.challenge1_outlier_projects TO anon, authenticated;
GRANT SELECT ON public.challenge1_cluster_efficiency TO anon, authenticated;
GRANT SELECT ON public.country_year_analysis TO anon, authenticated;
GRANT SELECT ON public.hrp_inform_aggregated TO anon, authenticated;

-- Grant all permissions to service role for data population
GRANT ALL ON public.challenge1_outlier_projects TO service_role;
GRANT ALL ON public.challenge1_cluster_efficiency TO service_role;
GRANT ALL ON public.country_year_analysis TO service_role;
GRANT ALL ON public.hrp_inform_aggregated TO service_role;

-- Grant sequence usage
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
