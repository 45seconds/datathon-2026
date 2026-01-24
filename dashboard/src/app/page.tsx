'use client';

import { useState, useEffect } from 'react';
import { Navbar, DataTable, NotebookViewer, CrisisMap, DatasetViewer } from '@/components';
import { CountryCrisisMetrics, DashboardSummary } from '@/types';
import { getCountryFlag } from '@/lib/flags';
import type { Ipynb } from 'react-ipynb-renderer';

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toFixed(0);
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(0)}M`;
  return `$${formatNumber(num)}`;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [countries, setCountries] = useState<CountryCrisisMetrics[]>([]);
  const [forgotten, setForgotten] = useState<CountryCrisisMetrics[]>([]);
  const [notebooks, setNotebooks] = useState<Map<string, Ipynb>>(new Map());
  const [notebookLoading, setNotebookLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Map state
  const [mapColorBy, setMapColorBy] = useState<'needRate' | 'coverageRate' | 'usdPerPersonInNeed' | 'mismatch'>('needRate');
  const [showCities, setShowCities] = useState(true);
  const [mapYear, setMapYear] = useState(2026);

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
    if (activeTab.startsWith('notebook:')) {
      const path = activeTab.replace('notebook:', '');
      if (!notebooks.has(path)) {
        setNotebookLoading(true);
        fetch(`/api/notebook?path=${encodeURIComponent(path)}`)
          .then((res) => res.json())
          .then((data) => {
            setNotebooks((prev) => new Map(prev).set(path, data.notebook));
          })
          .catch(console.error)
          .finally(() => setNotebookLoading(false));
      }
    }
  }, [activeTab, notebooks]);

  useEffect(() => {
    if (activeTab === 'maps') {
      fetch(`/api/metrics?type=countries&year=${mapYear}`)
        .then((res) => res.json())
        .then(setCountries)
        .catch(console.error);
    }
  }, [activeTab, mapYear]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-zinc-400">Loading...</span>
      </div>
    );
  }

  const notebookPath = activeTab.startsWith('notebook:') ? activeTab.replace('notebook:', '') : null;
  const datasetPath = activeTab.startsWith('dataset:') ? activeTab.replace('dataset:', '') : null;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Overview Tab */}
      {activeTab === 'overview' && summary && (
        <div>
          {/* Hero Section */}
          <section className="border-b border-zinc-100 dark:border-zinc-800">
            <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-8">
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white lg:text-5xl">
                Humanitarian Crisis Dashboard
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-zinc-500 dark:text-zinc-400">
                Analyzing humanitarian need vs resource allocation to identify underserved global crises. Data from OCHA HDX for 2024-2026.
              </p>
            </div>
          </section>

          {/* Stats Section */}
          <section className="border-b border-zinc-100 dark:border-zinc-800">
            <div className="mx-auto grid max-w-[1400px] grid-cols-2 lg:grid-cols-4">
              <div className="border-r border-zinc-100 px-6 py-10 dark:border-zinc-800 lg:px-8">
                <p className="text-sm text-zinc-500">Countries in Crisis</p>
                <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">{summary.totalCountries}</p>
              </div>
              <div className="border-r border-zinc-100 px-6 py-10 dark:border-zinc-800 lg:border-r lg:px-8">
                <p className="text-sm text-zinc-500">People in Need</p>
                <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight text-red-600">{formatNumber(summary.totalInNeed)}</p>
                <p className="mt-1 text-sm text-zinc-400">{(summary.avgCoverageRate * 100).toFixed(0)}% coverage</p>
              </div>
              <div className="border-r border-zinc-100 px-6 py-10 dark:border-zinc-800 lg:px-8">
                <p className="text-sm text-zinc-500">People Targeted</p>
                <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight text-emerald-600">{formatNumber(summary.totalTargeted)}</p>
              </div>
              <div className="px-6 py-10 lg:px-8">
                <p className="text-sm text-zinc-500">Funding Requirements</p>
                <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight text-blue-600">{formatCurrency(summary.totalRequirements)}</p>
                <p className="mt-1 text-sm text-zinc-400">~${summary.avgUsdPerPerson.toFixed(0)} per person</p>
              </div>
            </div>
          </section>

          {/* Underserved Section */}
          <section className="border-b border-zinc-100 dark:border-zinc-800">
            <div className="mx-auto max-w-[1400px] px-6 py-12 lg:px-8">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Potentially Underserved Crises</h2>
              <p className="mt-1 text-sm text-zinc-500">Countries with high need rates but relatively low resource allocation</p>
              
              <div className="mt-8 grid gap-6 lg:grid-cols-5">
                {forgotten.slice(0, 5).map((crisis, index) => (
                  <div key={crisis.iso3} className="group">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-sm font-semibold text-red-600 dark:bg-red-950 dark:text-red-400">
                        {index + 1}
                      </span>
                      <span className="text-2xl">{getCountryFlag(crisis.iso3)}</span>
                    </div>
                    <h3 className="mt-3 font-medium text-zinc-900 dark:text-white">{crisis.country}</h3>
                    <p className="text-sm text-zinc-500">{formatNumber(crisis.inNeed)} in need</p>
                    <div className="mt-3 flex gap-4">
                      <div>
                        <p className="text-2xl font-semibold tabular-nums text-red-600">{(crisis.needRate * 100).toFixed(0)}%</p>
                        <p className="text-xs text-zinc-400">need rate</p>
                      </div>
                      <div>
                        <p className="text-2xl font-semibold tabular-nums text-amber-600">{(crisis.coverageRate * 100).toFixed(0)}%</p>
                        <p className="text-xs text-zinc-400">coverage</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Full Table */}
          <section>
            <div className="mx-auto max-w-[1400px] px-6 py-12 lg:px-8">
              <DataTable
                data={countries}
                title="All Countries"
                description="Complete crisis metrics for all countries with humanitarian response plans"
              />
            </div>
          </section>
        </div>
      )}

      {/* Maps Tab */}
      {activeTab === 'maps' && (
        <div className="flex h-[calc(100vh-48px)] flex-col">
          {/* Map Controls */}
          <div className="flex items-center gap-6 border-b border-zinc-100 px-6 py-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-500">Color by</label>
              <select
                value={mapColorBy}
                onChange={(e) => setMapColorBy(e.target.value as typeof mapColorBy)}
                className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="needRate">Need Rate</option>
                <option value="coverageRate">Coverage Rate</option>
                <option value="usdPerPersonInNeed">USD per Person</option>
                <option value="mismatch">Mismatch Score</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-500">Year</label>
              <select
                value={mapYear}
                onChange={(e) => setMapYear(Number(e.target.value))}
                className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showCities}
                onChange={(e) => setShowCities(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span className="text-zinc-600 dark:text-zinc-400">Show cities</span>
            </label>
          </div>

          {/* Full Height Map */}
          <div className="flex-1">
            <CrisisMap
              data={countries}
              colorBy={mapColorBy}
              showCities={showCities}
              year={mapYear}
            />
          </div>
        </div>
      )}

      {/* Dataset Viewer */}
      {datasetPath && (
        <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-8">
          <DatasetViewer path={datasetPath} />
        </div>
      )}

      {/* Notebook Viewer */}
      {notebookPath && (
        <div className="mx-auto max-w-[1000px] px-6 py-8 lg:px-8">
          <NotebookViewer
            notebook={notebooks.get(notebookPath) || null}
            loading={notebookLoading}
          />
        </div>
      )}
    </div>
  );
}
