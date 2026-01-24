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
