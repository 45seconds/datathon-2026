'use client';

import dynamic from 'next/dynamic';
import type { Ipynb } from 'react-ipynb-renderer';

// Dynamically import IpynbRenderer with SSR disabled (it uses browser APIs)
const IpynbRenderer = dynamic(
  () => import('react-ipynb-renderer').then((mod) => mod.IpynbRenderer),
  { ssr: false }
);

interface NotebookViewerProps {
  notebook: Ipynb | null;
  loading?: boolean;
}

export function NotebookViewer({ notebook, loading }: NotebookViewerProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading notebook...
        </div>
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-zinc-500">Failed to load notebook</p>
      </div>
    );
  }

  return (
    <div className="notebook-container">
      <IpynbRenderer
        ipynb={notebook}
        syntaxTheme="ghcolors"
        language="python"
        bgTransparent={true}
      />
    </div>
  );
}
