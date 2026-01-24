'use client';

import { useState, useRef, useEffect } from 'react';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const DATASETS = [
  { id: 'hpc_hno_2024', label: 'HPC HNO 2024', path: 'data/geo_mismatch/hpc_hno_2024.csv' },
  { id: 'hpc_hno_2025', label: 'HPC HNO 2025', path: 'data/geo_mismatch/hpc_hno_2025.csv' },
  { id: 'hpc_hno_2026', label: 'HPC HNO 2026', path: 'data/geo_mismatch/hpc_hno_2026.csv' },
  { id: 'hrp', label: 'Humanitarian Response Plans', path: 'data/geo_mismatch/humanitarian-response-plans.csv' },
  { id: 'cod_pop_admin0', label: 'Population (Admin 0)', path: 'data/geo_mismatch/cod_population_admin0.csv' },
  { id: 'cod_pop_admin1', label: 'Population (Admin 1)', path: 'data/geo_mismatch/cod_population_admin1.csv' },
  { id: 'cod_pop_admin2', label: 'Population (Admin 2)', path: 'data/geo_mismatch/cod_population_admin2.csv' },
];

const NOTEBOOKS = [
  { id: 'geo_mismatch', label: 'Geo-Mismatch Analysis', path: 'notebooks/geo_mismatch.ipynb' },
  { id: 'starter', label: 'Starter Notebook', path: 'notebooks/DSC_Datathon_2026_Starter_Notebook.ipynb' },
];

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function Dropdown({
  label,
  items,
  onSelect,
  activeId,
}: {
  label: string;
  items: { id: string; label: string; path: string }[];
  onSelect: (id: string, path: string) => void;
  activeId?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors ${
          activeId
            ? 'font-medium text-zinc-900 dark:text-white'
            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
        }`}
      >
        {label}
        <ChevronIcon className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[240px] rounded-lg border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item.id, item.path);
                setOpen(false);
              }}
              className={`flex w-full items-center px-4 py-2 text-left text-sm transition-colors ${
                activeId === item.id
                  ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const [activeDataset, setActiveDataset] = useState<string | undefined>();
  const [activeNotebook, setActiveNotebook] = useState<string | undefined>();

  const handleDatasetSelect = (id: string, path: string) => {
    setActiveDataset(id);
    setActiveNotebook(undefined);
    onTabChange(`dataset:${path}`);
  };

  const handleNotebookSelect = (id: string, path: string) => {
    setActiveNotebook(id);
    setActiveDataset(undefined);
    onTabChange(`notebook:${path}`);
  };

  const handleTabClick = (tab: string) => {
    setActiveDataset(undefined);
    setActiveNotebook(undefined);
    onTabChange(tab);
  };

  const isOverview = activeTab === 'overview';
  const isMaps = activeTab === 'maps';

  return (
    <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-8">
        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
          DSC Datathon 2026
        </span>
        <nav className="flex items-center">
          <button
            onClick={() => handleTabClick('overview')}
            className={`px-3 py-1.5 text-sm transition-colors ${
              isOverview
                ? 'font-medium text-zinc-900 dark:text-white'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => handleTabClick('maps')}
            className={`px-3 py-1.5 text-sm transition-colors ${
              isMaps
                ? 'font-medium text-zinc-900 dark:text-white'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            Maps
          </button>
          <Dropdown
            label="Datasets"
            items={DATASETS}
            onSelect={handleDatasetSelect}
            activeId={activeDataset}
          />
          <Dropdown
            label="Notebooks"
            items={NOTEBOOKS}
            onSelect={handleNotebookSelect}
            activeId={activeNotebook}
          />
        </nav>
      </div>
    </header>
  );
}
