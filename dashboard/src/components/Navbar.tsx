'use client';

import { useState, useRef, useEffect } from 'react';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
<<<<<<< HEAD
=======
  onToggleChat: () => void;
  chatOpen: boolean;
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
}

const DATASETS = [
  { id: 'hpc_hno_2024', label: 'HPC HNO 2024', path: 'data/geo_mismatch/hpc_hno_2024.csv' },
  { id: 'hpc_hno_2025', label: 'HPC HNO 2025', path: 'data/geo_mismatch/hpc_hno_2025.csv' },
  { id: 'hpc_hno_2026', label: 'HPC HNO 2026', path: 'data/geo_mismatch/hpc_hno_2026.csv' },
<<<<<<< HEAD
  { id: 'hrp', label: 'Humanitarian Response Plans', path: 'data/geo_mismatch/humanitarian-response-plans.csv' },
  { id: 'cod_pop_admin0', label: 'Population (Admin 0)', path: 'data/geo_mismatch/cod_population_admin0.csv' },
  { id: 'cod_pop_admin1', label: 'Population (Admin 1)', path: 'data/geo_mismatch/cod_population_admin1.csv' },
  { id: 'cod_pop_admin2', label: 'Population (Admin 2)', path: 'data/geo_mismatch/cod_population_admin2.csv' },
];

const NOTEBOOKS = [
=======
  { id: 'hrp', label: 'Response Plans', path: 'data/geo_mismatch/humanitarian-response-plans.csv' },
  { id: 'cod_pop_admin0', label: 'Population (Admin 0)', path: 'data/geo_mismatch/cod_population_admin0.csv' },
];

const NOTEBOOKS = [
  { id: 'dsc_datathon', label: 'Final Submission', path: 'notebooks/DSC_Datathon.ipynb' },
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
  { id: 'geo_mismatch', label: 'Geo-Mismatch Analysis', path: 'notebooks/geo_mismatch.ipynb' },
  { id: 'starter', label: 'Starter Notebook', path: 'notebooks/DSC_Datathon_2026_Starter_Notebook.ipynb' },
];

<<<<<<< HEAD
function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

=======
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
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
<<<<<<< HEAD
            ? 'font-medium text-zinc-900 dark:text-white'
            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
        }`}
      >
        {label}
        <ChevronIcon className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[240px] rounded-lg border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
=======
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
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item.id, item.path);
                setOpen(false);
              }}
<<<<<<< HEAD
              className={`flex w-full items-center px-4 py-2 text-left text-sm transition-colors ${
                activeId === item.id
                  ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
=======
              className={`flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors ${
                activeId === item.id
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
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

<<<<<<< HEAD
export function Navbar({ activeTab, onTabChange }: NavbarProps) {
=======
export function Navbar({ activeTab, onTabChange, onToggleChat, chatOpen }: NavbarProps) {
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
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
<<<<<<< HEAD
    <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-8">
        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
=======
    <header className="sticky top-0 z-50 flex h-12 items-center border-b border-neutral-200 bg-white px-6">
      <div className="flex items-center gap-6">
        <span className="text-sm font-medium text-neutral-900">
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
          DSC Datathon 2026
        </span>
        <nav className="flex items-center">
          <button
            onClick={() => handleTabClick('overview')}
            className={`px-3 py-1.5 text-sm transition-colors ${
<<<<<<< HEAD
              isOverview
                ? 'font-medium text-zinc-900 dark:text-white'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
=======
              isOverview ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => handleTabClick('maps')}
            className={`px-3 py-1.5 text-sm transition-colors ${
<<<<<<< HEAD
              isMaps
                ? 'font-medium text-zinc-900 dark:text-white'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
=======
              isMaps ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
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
<<<<<<< HEAD
=======

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
>>>>>>> 5d9ae2cfa8499c593acb31f470c87a6a6fe6fdb5
    </header>
  );
}
