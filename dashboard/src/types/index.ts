// Core data types for the humanitarian crisis dashboard

export interface HumanitarianPlan {
  code: string;
  internalId: string;
  startDate: string;
  endDate: string;
  planVersion: string;
  categories: string;
  locations: string;
  years: string;
  origRequirements: number;
  revisedRequirements: number;
}

export interface HumanitarianNeed {
  countryISO3: string;
  admin1PCode: string | null;
  admin1Name: string | null;
  admin2PCode: string | null;
  admin2Name: string | null;
  description: string;
  cluster: string;
  category: string;
  population: number;
  inNeed: number;
  targeted: number;
  affected: number | null;
  reached: number | null;
  year: number;
}

export interface CountryPopulation {
  iso3: string;
  country: string;
  population: number;
  referenceYear: number;
}

// Aggregated metrics for dashboard display
export interface CountryCrisisMetrics {
  iso3: string;
  country: string;
  population: number;
  inNeed: number;
  targeted: number;
  needRate: number; // inNeed / population
  coverageRate: number; // targeted / inNeed
  fundingGap: number; // inNeed - targeted
  revisedRequirements: number;
  usdPerPersonInNeed: number;
  mismatch: number; // percentile(needRate) - percentile(usdPerPerson)
  year: number;
}

export interface DashboardSummary {
  totalCountries: number;
  totalInNeed: number;
  totalTargeted: number;
  totalRequirements: number;
  avgCoverageRate: number;
  avgUsdPerPerson: number;
}

export interface YearlyTrend {
  year: number;
  totalInNeed: number;
  totalTargeted: number;
  totalRequirements: number;
  coverageRate: number;
}

export interface ClusterMetrics {
  cluster: string;
  description: string;
  totalInNeed: number;
  totalTargeted: number;
  coverageRate: number;
  countryCount: number;
}
<<<<<<< HEAD
=======

export interface CountryClusterGap {
  cluster: string;
  inNeed: number;
  targeted: number;
  coverageRate: number;
  gap: number; // inNeed - targeted
}

export interface ForgottenCrisisWithSectors extends CountryCrisisMetrics {
  topGaps: CountryClusterGap[];
}

// INFORM Severity data
export interface INFORMSeverity {
  iso3: string;
  countryName: string;
  crisisType: string;
  severityIndex: number;
  severityCategory: string;
  trend: string;
  primaryDriver: string;
  drivers: string[];
  region: string;
  complexity: number;
  operatingEnv: number;
  year: number;
  lastUpdated: string;
}

// Timeline data from HRP
export interface CrisisTimeline {
  iso3: string;
  firstResponseDate: string;
  yearsSinceFirstResponse: number;
  plans: {
    code: string;
    startDate: string;
    endDate: string;
    requirements: number;
  }[];
}

// Full crisis detail for sidebar/panel
export interface CrisisDetail {
  // Basic info
  iso3: string;
  country: string;
  region: string;
  
  // Current metrics (latest year)
  currentMetrics: CountryCrisisMetrics;
  
  // INFORM severity data
  severity: INFORMSeverity | null;
  
  // Sector gaps
  sectorGaps: CountryClusterGap[];
  
  // Timeline
  timeline: CrisisTimeline | null;
  
  // Historical trends (2024-2026)
  trends: {
    year: number;
    inNeed: number;
    mismatch: number;
    usdPerPerson: number;
  }[];
  
  // Data sources for citations
  sources: {
    name: string;
    description: string;
    url?: string;
  }[];
}
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
