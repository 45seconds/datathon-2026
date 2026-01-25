'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { Ipynb } from 'react-ipynb-renderer';

import 'react-ipynb-renderer/dist/styles/default.css';

const IpynbRenderer = dynamic(
  () => import('react-ipynb-renderer').then((mod) => mod.IpynbRenderer),
  { ssr: false, loading: () => <div className="py-20 text-center text-sm text-neutral-400">Loading notebook...</div> }
);

interface NotebookViewerProps {
  notebook: Ipynb | null;
  loading?: boolean;
}

export function NotebookViewer({ notebook, loading }: NotebookViewerProps) {
  const [showCode, setShowCode] = useState(false);

  const displayNotebook = useMemo(() => {
    if (!notebook || showCode) return notebook;
    
    return {
      ...notebook,
      cells: notebook.cells?.map((cell) => {
        if (cell.cell_type === 'code') {
          return { ...cell, source: [] };
        }
        return cell;
      }),
    };
  }, [notebook, showCode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-neutral-400">Loading notebook...</span>
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-neutral-500">Failed to load notebook</span>
      </div>
    );
  }

  return (
    <div className="notebook-viewer">
      {/* Minimal toggle bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <span className="text-sm text-neutral-500">
          {notebook.cells?.length || 0} cells
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showCode}
            onChange={(e) => setShowCode(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-0 focus:ring-offset-0"
          />
          <span className="text-neutral-600">Show code</span>
        </label>
      </div>

      {/* Notebook content */}
      <div className={`notebook-content ${showCode ? '' : 'hide-code-inputs'}`}>
        <IpynbRenderer
          ipynb={displayNotebook as Ipynb}
          syntaxTheme="ghcolors"
          language="python"
          bgTransparent={true}
        />
      </div>
    </div>
  );
}
