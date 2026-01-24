'use client';

import { useState, useEffect } from 'react';
import { Navbar, StatCard, DataTable, CrisisRow, NotebookViewer } from '@/components';
import { CountryCrisisMetrics, DashboardSummary } from '@/types';
import type { Ipynb } from 'react-ipynb-renderer';

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(0)}K`;
  }
  return num.toFixed(0);
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(0)}M`;
  }
  return `$${formatNumber(num)}`;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [countries, setCountries] = useState<CountryCrisisMetrics[]>([]);
  const [forgotten, setForgotten] = useState<CountryCrisisMetrics[]>([]);
  const [notebook, setNotebook] = useState<Ipynb | null>(null);
  const [notebookLoading, setNotebookLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, countriesRes, forgottenRes] = await Promise.all([
          fetch('/api/metrics?type=summary&year=2026'),
          fetch('/api/metrics?type=countries&year=2026'),
          fetch('/api/metrics?type=forgotten&year=2026'),
        ]);

        setSummary(await summaryRes.json());
        setCountries(await countriesRes.json());
        setForgotten(await forgottenRes.json());
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'geo-mismatch' && !notebook) {
      setNotebookLoading(true);
      fetch('/api/notebook?path=notebooks/geo_mismatch.ipynb')
        .then((res) => res.json())
        .then((data) => {
          setNotebook(data.notebook as Ipynb);
        })
        .catch(console.error)
        .finally(() => setNotebookLoading(false));
    }
  }, [activeTab, notebook]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'overview' && summary && (
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Countries in Crisis"
                value={summary.totalCountries}
                subtitle="With humanitarian response plans"
              />
              <StatCard
                title="People in Need"
                value={formatNumber(summary.totalInNeed)}
                subtitle={`${(summary.avgCoverageRate * 100).toFixed(0)}% coverage rate`}
                trend={summary.avgCoverageRate < 0.7 ? 'down' : 'up'}
              />
              <StatCard
                title="People Targeted"
                value={formatNumber(summary.totalTargeted)}
                subtitle="By humanitarian programs"
              />
              <StatCard
                title="Total Requirements"
                value={formatCurrency(summary.totalRequirements)}
                subtitle={`~$${summary.avgUsdPerPerson.toFixed(0)} per person`}
              />
            </div>

            {/* Underserved Crises */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Potentially Underserved Crises
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    High need rate with relatively low resource allocation
                  </p>
                </div>
                <span className="text-xs text-zinc-400">2026</span>
              </div>
              <div className="space-y-2">
                {forgotten.slice(0, 5).map((crisis, index) => (
                  <CrisisRow key={crisis.iso3} crisis={crisis} rank={index + 1} />
                ))}
              </div>
            </div>

            {/* Data Table */}
            <DataTable
              data={countries}
              title="Country Crisis Metrics"
              description="Humanitarian needs and resource allocation by country"
            />

            {/* Footer Note */}
            <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
              Data: OCHA HDX — HPC HNO & Humanitarian Response Plans. Requirements are requested USD, not confirmed disbursements.
            </p>
          </div>
        )}

        {activeTab === 'geo-mismatch' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Geo-Mismatch Analysis
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Comparing humanitarian need (HPC HNO) to resources (HRP requirements) to identify forgotten crises
                </p>
              </div>
            </div>
            
            <NotebookViewer notebook={notebook} loading={notebookLoading} />
          </div>
        )}
      </main>
    </div>
  );
}
