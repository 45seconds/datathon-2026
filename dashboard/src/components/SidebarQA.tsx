'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { name: string; url?: string }[];
}

interface SidebarQAProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXAMPLES = [
  "Why is Sudan underfunded?",
  "Which sectors need attention in Myanmar?",
  "How has Yemen changed over time?",
];

export function SidebarQA({ isOpen, onClose }: SidebarQAProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (question: string) => {
    if (!question.trim() || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/crisis-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.answer || 'Sorry, I could not process that.',
        sources: data.sources,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'An error occurred. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed left-0 top-12 z-50 flex h-[calc(100vh-48px)] w-[360px] flex-col border-r border-neutral-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-medium text-neutral-900">Crisis Q&A</h2>
          <p className="text-xs text-neutral-500">Ask about humanitarian data</p>
        </div>
        <button onClick={onClose} className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              Ask questions about crises, funding, and trends.
            </p>
            <div className="space-y-2">
              {EXAMPLES.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSubmit(q)}
                  className="block w-full rounded border border-neutral-200 px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'ml-8 bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-700'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <p className="mt-2 text-xs text-neutral-500">
                    Sources: {msg.sources.map((s) => s.name).join(', ')}
                  </p>
                )}
              </div>
            ))}
            {loading && (
              <div className="rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-500">
                Thinking...
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 p-4">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(input); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 rounded border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
