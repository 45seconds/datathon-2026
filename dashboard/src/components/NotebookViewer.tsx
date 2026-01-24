'use client';

interface NotebookViewerProps {
  title: string;
  description: string;
  notebookPath: string;
  cells: NotebookCell[];
}

interface NotebookCell {
  type: 'markdown' | 'code' | 'output';
  content: string;
}

export function NotebookViewer({ title, description, cells }: NotebookViewerProps) {
  return (
    <div className="space-y-4">
      <div className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
      
      <div className="space-y-3">
        {cells.map((cell, index) => (
          <div key={index} className="rounded-lg border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
            {cell.type === 'markdown' ? (
              <div className="px-4 py-3 prose prose-sm prose-zinc dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: cell.content }} />
              </div>
            ) : cell.type === 'code' ? (
              <div className="bg-zinc-950 dark:bg-zinc-950">
                <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-1.5">
                  <span className="text-[10px] font-medium text-zinc-500">Python</span>
                </div>
                <pre className="overflow-x-auto p-3 text-xs text-zinc-300">
                  <code>{cell.content}</code>
                </pre>
              </div>
            ) : (
              <div className="bg-zinc-50 px-4 py-3 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                <pre className="overflow-x-auto whitespace-pre-wrap">{cell.content}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
