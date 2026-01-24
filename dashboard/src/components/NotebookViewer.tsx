'use client';

import dynamic from 'next/dynamic';
import type { Ipynb } from 'react-ipynb-renderer';
import 'react-ipynb-renderer/dist/styles/monokai.css';

const IpynbRenderer = dynamic(
  () => import('react-ipynb-renderer').then((mod) => mod.IpynbRenderer),
  { ssr: false, loading: () => <div className="py-8 text-center text-sm text-zinc-400">Loading notebook...</div> }
);

interface NotebookViewerProps {
  notebook: Ipynb | null;
  loading?: boolean;
}

export function NotebookViewer({ notebook, loading }: NotebookViewerProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-zinc-400">Loading notebook...</span>
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-zinc-500">Failed to load notebook</span>
      </div>
    );
  }

  return (
    <div className="ipynb-wrapper">
      <IpynbRenderer
        ipynb={notebook}
        syntaxTheme="xonokai"
        language="python"
        bgTransparent={false}
      />
    </div>
  );
}
