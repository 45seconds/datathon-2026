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
    if (!notebook) return notebook;

    // Remove noisy MLflow/Alembic log spam from saved notebook outputs.
    // This keeps the rendered notebook clean without mutating the underlying file.
    const NOISY_OUTPUT_SUBSTRINGS = [
      'alembic.runtime.plugins:',
      'alembic.runtime.migration:',
      'mlflow.store.db.utils:',
      'mlflow.models.model: `artifact_path` is deprecated.',
    ];

    const cleaned = {
      ...notebook,
      cells: notebook.cells?.map((cell: any) => {
        if (cell?.cell_type !== 'code') return cell;

        const outputs = Array.isArray(cell.outputs)
          ? cell.outputs
              .map((out: any) => {
                if (out?.output_type !== 'stream') return out;

                const textArr: string[] = Array.isArray(out.text)
                  ? out.text
                  : typeof out.text === 'string'
                    ? [out.text]
                    : [];

                const filteredText = textArr.filter(
                  (line) => !NOISY_OUTPUT_SUBSTRINGS.some((s) => line.includes(s)),
                );

                if (filteredText.length === 0) return null;

                return {
                  ...out,
                  text: Array.isArray(out.text) ? filteredText : filteredText.join(''),
                };
              })
              .filter(Boolean)
          : cell.outputs;

        return {
          ...cell,
          outputs,
          source: showCode ? cell.source : [],
        };
      }),
    };

    // If showCode is true, we keep original non-code cells exactly as-is
    // (code cells above already preserve source).
    if (showCode) return cleaned;

    // When code is hidden, ensure we didn't accidentally hide code sources in non-code cells.
    return cleaned;
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
