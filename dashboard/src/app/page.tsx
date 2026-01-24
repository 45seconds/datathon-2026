'use client';

import { useState, useEffect } from 'react';
import { Navbar, StatCard, DataTable, CrisisRow, NotebookViewer } from '@/components';
import { CountryCrisisMetrics, DashboardSummary } from '@/types';

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

interface NotebookCell {
  type: 'markdown' | 'code' | 'output';
  content: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [countries, setCountries] = useState<CountryCrisisMetrics[]>([]);
  const [forgotten, setForgotten] = useState<CountryCrisisMetrics[]>([]);
  const [notebookCells, setNotebookCells] = useState<NotebookCell[]>([]);
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
    if (activeTab === 'geo-mismatch') {
      fetch('/api/notebook?path=notebooks/geo_mismatch.ipynb')
        .then((res) => res.json())
        .then((data) => setNotebookCells(data.cells || []))
        .catch(console.error);
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-sm text-zinc-500">Loading...</div>
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
          <NotebookViewer
            title="Geo-Mismatch Analysis"
            description="Comparing humanitarian need (HPC HNO) to resources (HRP requirements) to identify forgotten crises"
            notebookPath="notebooks/geo_mismatch.ipynb"
            cells={notebookCells}
          />
        )}
      </main>
    </div>
  );
}
