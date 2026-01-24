'use client';

import { useEffect, useState } from 'react';

interface DatasetViewerProps {
  path: string;
}

interface CSVData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export function DatasetViewer({ path }: DatasetViewerProps) {
  const [data, setData] = useState<CSVData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleRows, setVisibleRows] = useState(100);

  const filename = path.split('/').pop() || path;

  useEffect(() => {
    setLoading(true);
    setError(null);
    setVisibleRows(100);

    fetch(`/api/dataset?path=${encodeURIComponent(path)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load dataset');
        return res.json();
      })
      .then((data) => setData(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [path]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading dataset...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{filename}</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {data.totalRows.toLocaleString()} rows · {data.headers.length} columns
          </p>
        </div>
        <div className="text-xs text-zinc-400">
          Showing {Math.min(visibleRows, data.rows.length).toLocaleString()} of {data.totalRows.toLocaleString()} rows
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="sticky left-0 bg-zinc-50 px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                #
              </th>
              {data.headers.map((header, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.rows.slice(0, visibleRows).map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="sticky left-0 bg-white px-3 py-2 text-xs tabular-nums text-zinc-400 dark:bg-zinc-950">
                  {rowIdx + 1}
                </td>
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="max-w-[300px] truncate whitespace-nowrap px-3 py-2 text-zinc-700 dark:text-zinc-300"
                    title={cell}
                  >
                    {cell || <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {visibleRows < data.rows.length && (
        <div className="flex justify-center">
          <button
            onClick={() => setVisibleRows((v) => Math.min(v + 100, data.rows.length))}
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Load more rows
          </button>
        </div>
      )}
    </div>
  );
}
