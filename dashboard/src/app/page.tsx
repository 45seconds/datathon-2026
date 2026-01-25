'use client';

import { useState, useEffect } from 'react';
import { Navbar, DataTable, NotebookViewer, CrisisMap, DatasetViewer, CrisisDetailPanel, SidebarQA, AIChatSidebar } from '@/components';
import { CountryCrisisMetrics, DashboardSummary } from '@/types';
import { getCountryFlag } from '@/lib/flags';
import type { Ipynb } from 'react-ipynb-renderer';

type UNLanguage = 'en' | 'fr' | 'es' | 'ru' | 'ar' | 'zh';

const UN_LANGUAGE_OPTIONS: Array<{ code: UNLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
  { code: 'zh', label: '中文' },
];

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
  const [mapLanguage, setMapLanguage] = useState<UNLanguage>('en');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [showQA, setShowQA] = useState(false);
  const [zoomToCountry, setZoomToCountry] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);

  // Listen for country selection from map popup button (for "View Full Details")
  useEffect(() => {
    const handleSelectCountry = (e: CustomEvent<string>) => {
      setSelectedCountry(e.detail);
    };
    window.addEventListener('selectCountry', handleSelectCountry as EventListener);
    return () => window.removeEventListener('selectCountry', handleSelectCountry as EventListener);
  }, []);

  // Handler for clicking directly on a country in the map (triggers zoom)
  const handleMapCountryClick = (iso3: string) => {
    setZoomToCountry(iso3);
    setTimeout(() => setZoomToCountry(null), 2000);
  };

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

  // Handler for clicking on a country in the table
  const handleCountryClick = (iso3: string) => {
    setActiveTab('maps');
    setZoomToCountry(iso3);
    // Clear zoom target after animation completes
    setTimeout(() => setZoomToCountry(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="text-sm text-neutral-400">Loading...</span>
      </div>
    );
  }

  const notebookPath = activeTab.startsWith('notebook:') ? activeTab.replace('notebook:', '') : null;
  const datasetPath = activeTab.startsWith('dataset:') ? activeTab.replace('dataset:', '') : null;

  return (
    <div className="min-h-screen bg-white">
      <Navbar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onToggleChat={() => setShowAIChat(!showAIChat)}
        chatOpen={showAIChat}
      />

      {/* Q&A Toggle Button - minimal style */}
      <button
        onClick={() => setShowQA(!showQA)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-700 shadow-sm transition-all hover:bg-neutral-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {showQA ? 'Close' : 'Ask'}
      </button>

      <SidebarQA isOpen={showQA} onClose={() => setShowQA(false)} />
      
      {/* AI Chat Sidebar */}
      <AIChatSidebar isOpen={showAIChat} onClose={() => setShowAIChat(false)} />

      {/* Main content wrapper - adjusts when AI chat is open */}
      <div className={`transition-all duration-300 ${showAIChat ? 'mr-[400px]' : ''}`}>

      {/* Overview Tab */}
      {activeTab === 'overview' && summary && (
        <div>
          {/* Hero Section - minimal */}
          <section className="border-b border-neutral-100">
            <div className="mx-auto max-w-6xl px-6 py-12">
              <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
                Humanitarian Crisis Dashboard
              </h1>
              <p className="mt-3 max-w-xl text-neutral-500">
                Identifying underserved global crises through need vs resource allocation analysis.
              </p>
            </div>
          </section>

          {/* Stats Section - clean grid */}
          <section className="border-b border-neutral-100">
            <div className="mx-auto grid max-w-6xl grid-cols-4 divide-x divide-neutral-100">
              <div className="px-6 py-8">
                <p className="text-sm text-neutral-500">Countries</p>
                <p className="mt-1 text-4xl font-semibold tabular-nums text-neutral-900">{summary.totalCountries}</p>
              </div>
              <div className="px-6 py-8">
                <p className="text-sm text-neutral-500">People in Need</p>
                <p className="mt-1 text-4xl font-semibold tabular-nums text-neutral-900">{formatNumber(summary.totalInNeed)}</p>
                <p className="mt-1 text-xs text-neutral-400">{(summary.avgCoverageRate * 100).toFixed(0)}% coverage</p>
              </div>
              <div className="px-6 py-8">
                <p className="text-sm text-neutral-500">Targeted</p>
                <p className="mt-1 text-4xl font-semibold tabular-nums text-neutral-900">{formatNumber(summary.totalTargeted)}</p>
              </div>
              <div className="px-6 py-8">
                <p className="text-sm text-neutral-500">Funding</p>
                <p className="mt-1 text-4xl font-semibold tabular-nums text-neutral-900">{formatCurrency(summary.totalRequirements)}</p>
                <p className="mt-1 text-xs text-neutral-400">${summary.avgUsdPerPerson.toFixed(0)}/person</p>
              </div>
            </div>
          </section>

          {/* Underserved Section - simplified */}
          <section className="border-b border-neutral-100">
            <div className="mx-auto max-w-6xl px-6 py-10">
              <h2 className="text-lg font-medium text-neutral-900">Top Underserved Crises</h2>
              <p className="mt-1 text-sm text-neutral-500">Highest need-to-resource mismatch</p>
              
              <div className="mt-6 grid gap-4 sm:grid-cols-5">
                {forgotten.slice(0, 5).map((crisis, index) => (
                  <div 
                    key={crisis.iso3} 
                    onClick={() => handleCountryClick(crisis.iso3)}
                    className="cursor-pointer rounded-lg border border-neutral-100 p-4 transition-all hover:border-neutral-300 hover:shadow-md"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-400">#{index + 1}</span>
                      <span className="text-lg">{getCountryFlag(crisis.iso3)}</span>
                    </div>
                    <h3 className="mt-2 font-medium text-neutral-900">{crisis.country}</h3>
                    <p className="text-xs text-neutral-500">{formatNumber(crisis.inNeed)} in need</p>
                    <div className="mt-3 flex gap-3 text-xs">
                      <div>
                        <span className="font-semibold text-neutral-900">{(crisis.needRate * 100).toFixed(0)}%</span>
                        <span className="text-neutral-400 ml-1">need</span>
                      </div>
                      <div>
                        <span className="font-semibold text-neutral-900">{(crisis.coverageRate * 100).toFixed(0)}%</span>
                        <span className="text-neutral-400 ml-1">covered</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Table Section */}
          <section>
            <div className="mx-auto max-w-6xl px-6 py-10">
              <DataTable
                data={countries}
                title="All Countries"
                description="Complete crisis metrics by country"
                onCountryClick={handleCountryClick}
              />
            </div>
          </section>
        </div>
      )}

      {/* Maps Tab */}
      {activeTab === 'maps' && (
        <div className="flex h-[calc(100vh-48px)] flex-col">
          {/* Map Controls - minimal */}
          <div className="flex items-center gap-4 border-b border-neutral-100 px-6 py-2.5">
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-500">Color</label>
              <select
                value={mapColorBy}
                onChange={(e) => setMapColorBy(e.target.value as typeof mapColorBy)}
                className="rounded border border-neutral-200 bg-white px-2.5 py-1 text-sm text-neutral-700"
              >
                <option value="needRate">Need Rate</option>
                <option value="coverageRate">Coverage</option>
                <option value="usdPerPersonInNeed">$/Person</option>
                <option value="mismatch">Mismatch</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-500">Language</label>
              <select
                value={mapLanguage}
                onChange={(e) => setMapLanguage(e.target.value as UNLanguage)}
                className="rounded border border-neutral-200 bg-white px-2.5 py-1 text-sm text-neutral-700"
              >
                {UN_LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-500">Year</label>
              <select
                value={mapYear}
                onChange={(e) => setMapYear(Number(e.target.value))}
                className="rounded border border-neutral-200 bg-white px-2.5 py-1 text-sm text-neutral-700"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={showCities}
                onChange={(e) => setShowCities(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-neutral-300"
              />
              <span className="text-neutral-600">Cities</span>
            </label>
          </div>

          <div className="flex-1">
            <CrisisMap
              data={countries}
              colorBy={mapColorBy}
              showCities={showCities}
              year={mapYear}
              onCountrySelect={setSelectedCountry}
              onCountryClick={handleMapCountryClick}
              zoomToCountry={zoomToCountry}
              language={mapLanguage}
            />
          </div>

          <CrisisDetailPanel
            iso3={selectedCountry}
            year={mapYear}
            onClose={() => setSelectedCountry(null)}
          />
        </div>
      )}

      {/* Dataset Viewer */}
      {datasetPath && (
        <div className="mx-auto max-w-6xl px-6 py-8">
          <DatasetViewer path={datasetPath} />
        </div>
      )}

      {/* Notebook Viewer */}
      {notebookPath && (
        <NotebookViewer
          notebook={notebooks.get(notebookPath) || null}
          loading={notebookLoading}
        />
      )}

      </div>{/* End of main content wrapper */}
    </div>
  );
}
