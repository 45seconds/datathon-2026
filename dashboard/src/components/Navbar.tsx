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
  { id: 'hrp', label: 'Response Plans', path: 'data/geo_mismatch/humanitarian-response-plans.csv' },
  { id: 'cod_pop_admin0', label: 'Population (Admin 0)', path: 'data/geo_mismatch/cod_population_admin0.csv' },
];

const NOTEBOOKS = [
  { id: 'geo_mismatch', label: 'Geo-Mismatch Analysis', path: 'notebooks/geo_mismatch.ipynb' },
  { id: 'starter', label: 'Starter Notebook', path: 'notebooks/DSC_Datathon_2026_Starter_Notebook.ipynb' },
];

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
            ? 'text-neutral-900'
            : 'text-neutral-500 hover:text-neutral-900'
        }`}
      >
        {label}
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item.id, item.path);
                setOpen(false);
              }}
              className={`flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors ${
                activeId === item.id
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
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
    <header className="sticky top-0 z-50 flex h-12 items-center border-b border-neutral-200 bg-white px-6">
      <div className="flex items-center gap-6">
        <span className="text-sm font-medium text-neutral-900">
          DSC Datathon 2026
        </span>
        <nav className="flex items-center">
          <button
            onClick={() => handleTabClick('overview')}
            className={`px-3 py-1.5 text-sm transition-colors ${
              isOverview ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => handleTabClick('maps')}
            className={`px-3 py-1.5 text-sm transition-colors ${
              isMaps ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
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
