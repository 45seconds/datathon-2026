'use client';

import { useState, useRef, useEffect } from 'react';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onToggleChat: () => void;
  chatOpen: boolean;
}

const DATASETS = [
  { id: 'hpc_hno_2024', label: 'HPC HNO 2024', path: 'data/geo_mismatch/hpc_hno_2024.csv' },
  { id: 'hpc_hno_2025', label: 'HPC HNO 2025', path: 'data/geo_mismatch/hpc_hno_2025.csv' },
  { id: 'hpc_hno_2026', label: 'HPC HNO 2026', path: 'data/geo_mismatch/hpc_hno_2026.csv' },
  { id: 'hrp', label: 'Response Plans', path: 'data/geo_mismatch/humanitarian-response-plans.csv' },
  { id: 'cod_pop_admin0', label: 'Population (Admin 0)', path: 'data/geo_mismatch/cod_population_admin0.csv' },
];

const NOTEBOOKS = [
  { id: 'dsc_datathon', label: 'Final Submission', path: 'notebooks/DSC_Datathon.ipynb' },
  { id: 'geo_mismatch', label: 'Geo-Mismatch Analysis', path: 'notebooks/geo_mismatch.ipynb' },
  { id: 'geo_mismatch_2', label: 'Geo-Mismatch 2', path: 'notebooks/geo_mismatch_2.ipynb' },
  { id: 'challenge1', label: 'Challenge 1: Beneficiary Targeting', path: 'notebooks/challenge1_smart_beneficiary_targeting_validation.ipynb' },
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

export function Navbar({ activeTab, onTabChange, onToggleChat, chatOpen }: NavbarProps) {
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

      {/* Spacer to push AI button to right */}
      <div className="flex-1" />

      {/* AI Chat Toggle Button */}
      <button
        onClick={onToggleChat}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
          chatOpen
            ? 'bg-amber-100 text-amber-700'
            : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
        }`}
        title="Ask AI about crisis data"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="hidden sm:inline">Ask AI</span>
      </button>
    </header>
  );
}
